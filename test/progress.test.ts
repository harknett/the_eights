import { describe, expect, it } from "vitest";

import { addDays, startOfWeek } from "@/lib/dates";
import { METRICS, metricsByCadence, proteinTarget, requireMetric } from "@/lib/metrics";
import {
  countMet,
  currentStreak,
  dailyEightsMet,
  progressFor,
  progressForAll,
  windowFor,
  type Entry,
} from "@/lib/progress";

/** 2 September 2026 is a Wednesday. */
const WED = "2026-09-02";

function entry(metricId: string, date: string, amount: number): Entry {
  return { metricId, date, amount };
}

describe("the eight", () => {
  it("is eight of them", () => {
    expect(METRICS).toHaveLength(8);
  });

  it("has unique ids", () => {
    const ids = METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("splits into the cadences the rules describe", () => {
    expect(metricsByCadence("daily").map((m) => m.id)).toEqual([
      "sleep",
      "steps",
      "produce",
      "protein",
      "mobility",
    ]);
    expect(metricsByCadence("weekly").map((m) => m.id)).toEqual(["outdoor", "people"]);
    expect(metricsByCadence("rolling14").map((m) => m.id)).toEqual(["training"]);
  });

  it("carries the targets from the rules", () => {
    expect(requireMetric("sleep").target).toBe(480); // 8 hours, in minutes
    expect(requireMetric("steps").target).toBe(8000);
    expect(requireMetric("produce").target).toBe(800);
    expect(requireMetric("mobility").target).toBe(8);
    expect(requireMetric("training").target).toBe(8);
    expect(requireMetric("outdoor").target).toBe(2);
    expect(requireMetric("people").target).toBe(180);
    // Protein is the one that depends on the person.
    expect(requireMetric("protein").target).toBeNull();
  });
});

describe("windows", () => {
  it("judges a daily metric on the day itself", () => {
    expect(windowFor("daily", WED)).toMatchObject({ from: WED, to: WED });
  });

  it("runs a week Monday to Sunday", () => {
    const week = windowFor("weekly", WED);
    expect(week.from).toBe("2026-08-31"); // the Monday
    expect(week.to).toBe("2026-09-06"); // the Sunday
    expect(startOfWeek("2026-09-06")).toBe("2026-08-31"); // Sunday belongs to it
    expect(startOfWeek("2026-09-07")).toBe("2026-09-07"); // the next Monday starts over
  });

  it("rolls the fortnight rather than fixing it to the calendar", () => {
    const window = windowFor("rolling14", WED);
    expect(window.from).toBe("2026-08-20");
    expect(window.to).toBe(WED);
    // Fourteen days inclusive, and it moves with the day.
    expect(windowFor("rolling14", addDays(WED, 1)).from).toBe("2026-08-21");
  });
});

describe("daily totals build up through the day", () => {
  const produce = requireMetric("produce");

  it("adds entries together", () => {
    const entries = [
      entry("produce", WED, 150),
      entry("produce", WED, 200),
      entry("produce", WED, 300),
    ];
    const p = progressFor(produce, entries, WED, null);
    expect(p.value).toBe(650);
    expect(p.met).toBe(false);
    expect(p.remaining).toBe(150);
    expect(p.fraction).toBeCloseTo(650 / 800);
  });

  it("is met once the target is reached, and does not overflow", () => {
    const entries = [entry("produce", WED, 500), entry("produce", WED, 400)];
    const p = progressFor(produce, entries, WED, null);
    expect(p.value).toBe(900);
    expect(p.met).toBe(true);
    expect(p.remaining).toBe(0);
    expect(p.fraction).toBe(1);
  });

  it("ignores yesterday's entries and another metric's", () => {
    const entries = [
      entry("produce", addDays(WED, -1), 800),
      entry("protein", WED, 800),
      entry("produce", WED, 100),
    ];
    expect(progressFor(produce, entries, WED, null).value).toBe(100);
  });
});

describe("protein follows body weight", () => {
  const protein = requireMetric("protein");

  it("is 0.8g a pound", () => {
    expect(proteinTarget(200)).toBe(160);
    expect(proteinTarget(155)).toBe(124);
    expect(proteinTarget(97)).toBe(78); // 77.6, rounded
  });

  it("has no target until a weight is known", () => {
    const p = progressFor(protein, [entry("protein", WED, 50)], WED, null);
    expect(p.target).toBeNull();
    expect(p.fraction).toBeNull();
    expect(p.met).toBe(false);
    // The amount eaten is still counted and shown.
    expect(p.value).toBe(50);
  });

  it("is met against the weight-derived target", () => {
    const entries = [entry("protein", WED, 90), entry("protein", WED, 70)];
    const p = progressFor(protein, entries, WED, 200);
    expect(p.target).toBe(160);
    expect(p.value).toBe(160);
    expect(p.met).toBe(true);
  });

  it("moves when the weight does", () => {
    const entries = [entry("protein", WED, 130)];
    expect(progressFor(protein, entries, WED, 160).met).toBe(true); // target 128
    expect(progressFor(protein, entries, WED, 200).met).toBe(false); // target 160
  });

  it("rejects a weight that is not a weight", () => {
    expect(proteinTarget(0)).toBeNull();
    expect(proteinTarget(-10)).toBeNull();
  });
});

describe("outdoor play counts blocks, not minutes", () => {
  const outdoor = requireMetric("outdoor");

  it("counts only blocks of eighty minutes or more", () => {
    const entries = [
      entry("outdoor", WED, 90),
      entry("outdoor", WED, 80), // exactly eighty counts
      entry("outdoor", WED, 79), // one minute short does not
    ];
    const p = progressFor(outdoor, entries, WED, null);
    expect(p.value).toBe(2);
    expect(p.met).toBe(true);
    expect(p.shortOfQualifying).toBe(1);
  });

  it("does not let many short walks add up to a block", () => {
    // Six half-hour walks is three hours outdoors, and still no blocks.
    const entries = Array.from({ length: 6 }, () => entry("outdoor", WED, 30));
    const p = progressFor(outdoor, entries, WED, null);
    expect(p.value).toBe(0);
    expect(p.met).toBe(false);
    expect(p.shortOfQualifying).toBe(6);
  });

  it("counts across the whole week", () => {
    const monday = startOfWeek(WED);
    const entries = [entry("outdoor", monday, 90), entry("outdoor", addDays(monday, 5), 100)];
    expect(progressFor(outdoor, entries, WED, null).met).toBe(true);
  });

  it("starts again the following Monday", () => {
    const lastWeek = addDays(startOfWeek(WED), -2);
    const entries = [entry("outdoor", lastWeek, 90), entry("outdoor", lastWeek, 90)];
    expect(progressFor(outdoor, entries, WED, null).value).toBe(0);
  });
});

describe("training over a rolling fortnight", () => {
  const training = requireMetric("training");

  it("counts every session, however short", () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry("training", addDays(WED, -i), 20),
    );
    const p = progressFor(training, entries, WED, null);
    expect(p.value).toBe(8);
    expect(p.met).toBe(true);
  });

  it("still counts a session from thirteen days ago", () => {
    const entries = [entry("training", addDays(WED, -13), 45)];
    expect(progressFor(training, entries, WED, null).value).toBe(1);
  });

  it("drops one from fourteen days ago", () => {
    const entries = [entry("training", addDays(WED, -14), 45)];
    expect(progressFor(training, entries, WED, null).value).toBe(0);
  });

  it("does not forgive a quiet fortnight when the month turns", () => {
    // Eight sessions, but all of them more than a fortnight back.
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry("training", addDays(WED, -20 - i), 45),
    );
    expect(progressFor(training, entries, WED, null).met).toBe(false);
  });
});

describe("the day as a whole", () => {
  const daily = metricsByCadence("daily");

  function fullDay(date: string): Entry[] {
    return [
      entry("sleep", date, 480),
      entry("steps", date, 8000),
      entry("produce", date, 800),
      entry("protein", date, 160),
      entry("mobility", date, 8),
    ];
  }

  it("counts how many of the eight are met", () => {
    const all = progressForAll(METRICS, fullDay(WED), WED, 200);
    expect(countMet(all)).toEqual({ met: 5, total: 8 });
  });

  it("marks a day complete only when every daily target is met", () => {
    expect(dailyEightsMet(daily, fullDay(WED), WED, 200)).toEqual({ met: 5, total: 5 });

    const short = fullDay(WED).filter((e) => e.metricId !== "mobility");
    expect(dailyEightsMet(daily, short, WED, 200).met).toBe(4);
  });

  it("counts protein as unmet when there is no weight to judge it by", () => {
    expect(dailyEightsMet(daily, fullDay(WED), WED, null).met).toBe(4);
  });
});

describe("streaks", () => {
  const daily = metricsByCadence("daily");

  function fullDays(dates: string[]): Entry[] {
    return dates.flatMap((date) => [
      entry("sleep", date, 480),
      entry("steps", date, 8000),
      entry("produce", date, 800),
      entry("protein", date, 160),
      entry("mobility", date, 8),
    ]);
  }

  it("counts back over complete days", () => {
    const days = [WED, addDays(WED, -1), addDays(WED, -2)];
    expect(currentStreak(daily, fullDays(days), WED, 200)).toBe(3);
  });

  it("stops at the first day that fell short", () => {
    const entries = [...fullDays([WED, addDays(WED, -1)]), ...fullDays([addDays(WED, -3)])];
    // Two days back is missing entirely, so the run is two.
    expect(currentStreak(daily, entries, WED, 200)).toBe(2);
  });

  it("does not hold an unfinished today against you", () => {
    // Yesterday and the day before are complete; today has barely started.
    const entries = [
      ...fullDays([addDays(WED, -1), addDays(WED, -2)]),
      entry("steps", WED, 500),
    ];
    expect(currentStreak(daily, entries, WED, 200)).toBe(2);
  });

  it("is zero with nothing logged", () => {
    expect(currentStreak(daily, [], WED, 200)).toBe(0);
  });
});
