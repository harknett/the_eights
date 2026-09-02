import { DatabaseSync } from "node:sqlite";

import { MIGRATIONS } from "./migrations";
import type { LogEntry, NewLogEntry, User, UserRole } from "./types";

type Row = Record<string, unknown>;

const str = (v: unknown): string => String(v);
const nstr = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number => Number(v);
const nnum = (v: unknown): number | null => (v == null ? null : Number(v));

function mapUser(r: Row): User {
  return {
    id: num(r.id),
    email: str(r.email),
    name: str(r.name),
    role: str(r.role) as UserRole,
    weightLb: nnum(r.weight_lb),
    mustChangePassword: num(r.must_change_password) === 1,
    createdAt: str(r.created_at),
  };
}

function mapEntry(r: Row): LogEntry {
  return {
    id: num(r.id),
    userId: num(r.user_id),
    metricId: str(r.metric_id),
    date: str(r.date),
    amount: num(r.amount),
    notes: nstr(r.notes),
    createdAt: str(r.created_at),
  };
}

export class Store {
  private readonly db: DatabaseSync;

  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    const row = this.db.prepare("PRAGMA user_version").get() as { user_version: number };
    for (let version = row.user_version; version < MIGRATIONS.length; version++) {
      this.db.exec(MIGRATIONS[version]!);
    }
    // user_version cannot be parameterised; the value is an integer we control.
    this.db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
  }

  close(): void {
    this.db.close();
  }

  /** Run a unit of work in a transaction, so a failure leaves nothing behind. */
  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  // --- people --------------------------------------------------------------

  countUsers(): number {
    return num((this.db.prepare("SELECT COUNT(*) AS n FROM users").get() as Row).n);
  }

  createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
    weightLb?: number | null;
    mustChangePassword?: boolean;
  }): User {
    const info = this.db
      .prepare(
        `INSERT INTO users (email, name, password_hash, role, weight_lb, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.email.toLowerCase(),
        input.name,
        input.passwordHash,
        input.role,
        input.weightLb ?? null,
        input.mustChangePassword ? 1 : 0,
      );
    return this.getUser(Number(info.lastInsertRowid))!;
  }

  getUser(id: number): User | undefined {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
    return row ? mapUser(row) : undefined;
  }

  findUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
    const row = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
      | Row
      | undefined;
    if (!row) return undefined;
    return { ...mapUser(row), passwordHash: str(row.password_hash) };
  }

  listUsers(): User[] {
    const rows = this.db.prepare("SELECT * FROM users ORDER BY created_at").all() as Row[];
    return rows.map(mapUser);
  }

  setWeight(userId: number, weightLb: number | null): void {
    this.db.prepare("UPDATE users SET weight_lb = ? WHERE id = ?").run(weightLb, userId);
  }

  setName(userId: number, name: string): void {
    this.db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
  }

  /**
   * Replace a password. `mustChange` says whether it is the holder's own
   * choice (false) or one somebody else set for them (true).
   */
  setPassword(userId: number, passwordHash: string, mustChange = false): void {
    this.db
      .prepare("UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?")
      .run(passwordHash, mustChange ? 1 : 0, userId);
  }

  // --- sessions ------------------------------------------------------------

  createSession(tokenHash: string, userId: number, expiresAt: string): void {
    this.db
      .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .run(tokenHash, userId, expiresAt);
  }

  findSessionUser(tokenHash: string): User | undefined {
    const row = this.db
      .prepare(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
      )
      .get(tokenHash) as Row | undefined;
    return row ? mapUser(row) : undefined;
  }

  deleteSession(tokenHash: string): void {
    this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }

  deleteExpiredSessions(): void {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  }

  /** Sign a person out everywhere - used when their password changes. */
  deleteUserSessions(userId: number): void {
    this.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }

  // --- entries -------------------------------------------------------------

  addEntry(input: NewLogEntry): LogEntry {
    const info = this.db
      .prepare(
        "INSERT INTO entries (user_id, metric_id, date, amount, notes) VALUES (?, ?, ?, ?, ?)",
      )
      .run(input.userId, input.metricId, input.date, input.amount, input.notes ?? null);
    return this.getEntry(Number(info.lastInsertRowid))!;
  }

  getEntry(id: number): LogEntry | undefined {
    const row = this.db.prepare("SELECT * FROM entries WHERE id = ?").get(id) as Row | undefined;
    return row ? mapEntry(row) : undefined;
  }

  /** Scoped to the owner of the entry: nobody edits somebody else's log. */
  deleteEntry(id: number, userId: number): boolean {
    const info = this.db
      .prepare("DELETE FROM entries WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return Number(info.changes) > 0;
  }

  /**
   * Entries across a span of days.
   *
   * The dashboard needs a fortnight at once - the rolling training window is
   * the longest any metric looks back - so one query serves the whole page.
   */
  entriesBetween(userId: number, from: string, to: string): LogEntry[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, id DESC",
      )
      .all(userId, from, to) as Row[];
    return rows.map(mapEntry);
  }

  entriesOn(userId: number, date: string): LogEntry[] {
    return this.entriesBetween(userId, date, date);
  }

  /** Most recent entries, for the log page. */
  recentEntries(userId: number, limit: number): LogEntry[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?",
      )
      .all(userId, limit) as Row[];
    return rows.map(mapEntry);
  }

  /** The earliest day anything was logged, for bounding a history view. */
  firstEntryDate(userId: number): string | null {
    const row = this.db
      .prepare("SELECT MIN(date) AS d FROM entries WHERE user_id = ?")
      .get(userId) as Row;
    return nstr(row.d);
  }
}
