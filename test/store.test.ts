import { DatabaseSync } from "node:sqlite";

import { beforeEach, describe, expect, it } from "vitest";

import { MIGRATIONS } from "@/lib/db/migrations";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { Store } from "@/lib/db/store";
import { addDays } from "@/lib/dates";
import { METRICS, metricsByCadence } from "@/lib/metrics";
import { progressFor, progressForAll, type Entry } from "@/lib/progress";
import { requireMetric } from "@/lib/metrics";

const WED = "2026-09-02";

let store: Store;
let userId: number;

beforeEach(() => {
  store = new Store(":memory:");
  userId = store.createUser({
    email: "me@home.test",
    name: "Sam",
    passwordHash: "x",
    role: "owner",
    weightLb: 200,
  }).id;
});

describe("people", () => {
  it("keeps the weight that gives protein its target", () => {
    expect(store.getUser(userId)!.weightLb).toBe(200);
    store.setWeight(userId, 185.5);
    expect(store.getUser(userId)!.weightLb).toBe(185.5);
  });

  it("allows clearing the weight", () => {
    store.setWeight(userId, null);
    expect(store.getUser(userId)!.weightLb).toBeNull();
  });

  it("refuses a weight that is not a weight", () => {
    expect(() =>
      store.createUser({ email: "b@h.test", name: "B", passwordHash: "x", role: "member", weightLb: 0 }),
    ).toThrow();
    expect(() =>
      store.createUser({ email: "c@h.test", name: "C", passwordHash: "x", role: "member", weightLb: -5 }),
    ).toThrow();
  });

  it("finds by email regardless of case", () => {
    store.createUser({ email: "Other@Home.test", name: "Other", passwordHash: "x", role: "member" });
    expect(store.findUserByEmail("other@home.test")?.name).toBe("Other");
  });

  it("only allows the two roles it means", () => {
    expect(() =>
      // @ts-expect-error deliberately invalid, to prove the constraint bites
      store.createUser({ email: "d@h.test", name: "D", passwordHash: "x", role: "admin" }),
    ).toThrow();
  });
});

describe("entries", () => {
  it("records each addition as its own row, so a day builds up", () => {
    store.addEntry({ userId, metricId: "produce", date: WED, amount: 150 });
    store.addEntry({ userId, metricId: "produce", date: WED, amount: 200 });

    const entries = store.entriesOn(userId, WED);
    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, e) => sum + e.amount, 0)).toBe(350);
  });

  it("refuses an entry of nothing", () => {
    expect(() => store.addEntry({ userId, metricId: "steps", date: WED, amount: 0 })).toThrow();
    expect(() => store.addEntry({ userId, metricId: "steps", date: WED, amount: -100 })).toThrow();
  });

  it("reads back a span of days", () => {
    store.addEntry({ userId, metricId: "steps", date: WED, amount: 5000 });
    store.addEntry({ userId, metricId: "steps", date: addDays(WED, -3), amount: 6000 });
    store.addEntry({ userId, metricId: "steps", date: addDays(WED, -30), amount: 7000 });

    expect(store.entriesBetween(userId, addDays(WED, -13), WED)).toHaveLength(2);
  });

  it("only removes your own entries", () => {
    const other = store.createUser({
      email: "other@home.test", name: "Other", passwordHash: "x", role: "member",
    });
    const mine = store.addEntry({ userId, metricId: "steps", date: WED, amount: 1000 });

    expect(store.deleteEntry(mine.id, other.id)).toBe(false);
    expect(store.getEntry(mine.id)).toBeDefined();

    expect(store.deleteEntry(mine.id, userId)).toBe(true);
    expect(store.getEntry(mine.id)).toBeUndefined();
  });

  it("keeps each person's log to themselves", () => {
    const other = store.createUser({
      email: "other@home.test", name: "Other", passwordHash: "x", role: "member",
    });
    store.addEntry({ userId, metricId: "steps", date: WED, amount: 1000 });
    store.addEntry({ userId: other.id, metricId: "steps", date: WED, amount: 9000 });

    expect(store.entriesOn(userId, WED)).toHaveLength(1);
    expect(store.entriesOn(other.id, WED)[0]!.amount).toBe(9000);
  });

  it("would go away with the person, rather than being orphaned", () => {
    // Nothing removes a person yet, but the schema has to be ready for it, so
    // this checks the cascade at the level it is declared.
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    for (const migration of MIGRATIONS) db.exec(migration);

    db.prepare("INSERT INTO users (email,name,password_hash,role) VALUES (?,?,?,?)")
      .run("gone@home.test", "Gone", "x", "member");
    db.prepare("INSERT INTO entries (user_id,metric_id,date,amount) VALUES (?,?,?,?)")
      .run(1, "steps", WED, 1000);
    db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)")
      .run("t", 1, "2999-01-01 00:00:00");

    db.prepare("DELETE FROM users WHERE id = 1").run();

    const entries = db.prepare("SELECT COUNT(*) AS n FROM entries").get() as { n: number };
    const sessions = db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number };
    expect(entries.n).toBe(0);
    expect(sessions.n).toBe(0);
    db.close();
  });
});

describe("sessions", () => {
  it("resolves a live session and ignores an expired one", () => {
    store.createSession("live", userId, "2999-01-01 00:00:00");
    store.createSession("dead", userId, "2000-01-01 00:00:00");
    expect(store.findSessionUser("live")?.id).toBe(userId);
    expect(store.findSessionUser("dead")).toBeUndefined();
  });

  it("clears every session for one person without touching another's", () => {
    const other = store.createUser({
      email: "other@home.test", name: "Other", passwordHash: "x", role: "member",
    });
    store.createSession("a", userId, "2999-01-01 00:00:00");
    store.createSession("b", userId, "2999-01-01 00:00:00");
    store.createSession("theirs", other.id, "2999-01-01 00:00:00");

    store.deleteUserSessions(userId);
    expect(store.findSessionUser("a")).toBeUndefined();
    expect(store.findSessionUser("theirs")?.id).toBe(other.id);
  });
});

describe("passwords", () => {
  it("verifies the right one and rejects the wrong one", async () => {
    const hash = await hashPassword("a real password");
    expect(await verifyPassword("a real password", hash)).toBe(true);
    expect(await verifyPassword("not it", hash)).toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });

  it("fails closed on a malformed hash", async () => {
    for (const bad of ["", "nope", "scrypt$1$2$3"]) {
      expect(await verifyPassword("x", bad)).toBe(false);
    }
  });

  it("takes the hold off when the password becomes their own", async () => {
    store.setPassword(userId, await hashPassword("temp"), true);
    expect(store.getUser(userId)!.mustChangePassword).toBe(true);
    store.setPassword(userId, await hashPassword("mine"), false);
    expect(store.getUser(userId)!.mustChangePassword).toBe(false);
  });
});

describe("a stored day reaches the dashboard", () => {
  it("adds up what was logged and marks what is met", () => {
    for (const amount of [150, 200, 300, 200]) {
      store.addEntry({ userId, metricId: "produce", date: WED, amount });
    }
    store.addEntry({ userId, metricId: "steps", date: WED, amount: 8200 });
    store.addEntry({ userId, metricId: "outdoor", date: WED, amount: 95 });
    store.addEntry({ userId, metricId: "outdoor", date: WED, amount: 40 });

    const entries: Entry[] = store
      .entriesBetween(userId, addDays(WED, -13), WED)
      .map((e) => ({ metricId: e.metricId, date: e.date, amount: e.amount }));

    const user = store.getUser(userId)!;
    const all = progressForAll(METRICS, entries, WED, user.weightLb);

    const produce = all.find((p) => p.metric.id === "produce")!;
    expect(produce.value).toBe(850);
    expect(produce.met).toBe(true);

    expect(all.find((p) => p.metric.id === "steps")!.met).toBe(true);

    // One block of 95 counts, the 40-minute outing does not.
    const outdoor = all.find((p) => p.metric.id === "outdoor")!;
    expect(outdoor.value).toBe(1);
    expect(outdoor.shortOfQualifying).toBe(1);
    expect(outdoor.met).toBe(false);

    // Protein has a target from the stored weight, but nothing eaten yet.
    const protein = all.find((p) => p.metric.id === "protein")!;
    expect(protein.target).toBe(160);
    expect(protein.value).toBe(0);
  });

  it("gives protein no target once the weight is cleared", () => {
    store.setWeight(userId, null);
    const user = store.getUser(userId)!;
    const p = progressFor(requireMetric("protein"), [], WED, user.weightLb);
    expect(p.target).toBeNull();
  });

  it("covers every metric with the fortnight the dashboard reads", () => {
    // The longest window any metric looks back over must fit in one query.
    const longest = Math.max(
      ...METRICS.map((m) => (m.cadence === "rolling14" ? 14 : m.cadence === "weekly" ? 7 : 1)),
    );
    expect(longest).toBeLessThanOrEqual(14);
    expect(metricsByCadence("rolling14")).toHaveLength(1);
  });
});
