import { describe, expect, it } from "vitest";

import { parseAmountFor, parseCount, parseGrams, parseMinutes } from "@/lib/amounts";
import {
  formatAmount,
  formatMinutes,
  formatPreset,
  formatProgress,
  requireMetric,
} from "@/lib/metrics";

describe("parseMinutes", () => {
  it("reads the ways a length of time gets written", () => {
    expect(parseMinutes("45m", "minutes")).toBe(45);
    expect(parseMinutes("1h", "minutes")).toBe(60);
    expect(parseMinutes("1h 30m", "minutes")).toBe(90);
    expect(parseMinutes("1h30", "minutes")).toBe(90);
    expect(parseMinutes("1:30", "minutes")).toBe(90);
    expect(parseMinutes("90min", "minutes")).toBe(90);
    expect(parseMinutes("7:45", "minutes")).toBe(465);
  });

  it("reads a bare number the way the metric expects", () => {
    // The trap: "8" against sleep is eight hours, against mobility eight minutes.
    expect(parseMinutes("8", "hours")).toBe(480);
    expect(parseMinutes("8", "minutes")).toBe(8);
    expect(parseMinutes("7.5", "hours")).toBe(450);
  });

  it("refuses what it cannot read", () => {
    for (const bad of ["", "soon", "-30", "1h2h", "abc"]) {
      expect(() => parseMinutes(bad, "minutes"), `expected "${bad}" to be refused`).toThrow();
    }
  });
});

describe("parseCount and parseGrams", () => {
  it("tolerates the separators a phone pastes in", () => {
    expect(parseCount("8,000", "steps")).toBe(8000);
    expect(parseCount(" 8 000 ", "steps")).toBe(8000);
    expect(parseGrams("150g")).toBe(150);
    expect(parseGrams("1,200 grams")).toBe(1200);
  });

  it("rounds to whole units", () => {
    expect(parseCount("8000.6", "steps")).toBe(8001);
    expect(parseGrams("150.4")).toBe(150);
  });

  it("refuses nonsense", () => {
    for (const bad of ["", "lots", "-500", "8k"]) {
      expect(() => parseCount(bad, "steps"), `expected "${bad}" to be refused`).toThrow();
    }
  });
});

describe("parseAmountFor", () => {
  it("uses each metric's own unit", () => {
    expect(parseAmountFor(requireMetric("sleep"), "7h 45m")).toBe(465);
    expect(parseAmountFor(requireMetric("steps"), "8,000")).toBe(8000);
    expect(parseAmountFor(requireMetric("produce"), "150g")).toBe(150);
    expect(parseAmountFor(requireMetric("protein"), "30")).toBe(30);
    expect(parseAmountFor(requireMetric("mobility"), "8")).toBe(8);
    expect(parseAmountFor(requireMetric("outdoor"), "90")).toBe(90);
  });

  it("reads a bare 8 as hours for sleep and minutes for mobility", () => {
    expect(parseAmountFor(requireMetric("sleep"), "8")).toBe(480);
    expect(parseAmountFor(requireMetric("mobility"), "8")).toBe(8);
  });

  it("refuses zero and negatives, which are never a real entry", () => {
    expect(() => parseAmountFor(requireMetric("steps"), "0")).toThrow(/greater than zero/);
    expect(() => parseAmountFor(requireMetric("produce"), "-100")).toThrow();
  });

  it("refuses an amount far beyond anything real", () => {
    expect(() => parseAmountFor(requireMetric("steps"), "99999999")).toThrow(/larger than/);
  });
});

describe("formatting", () => {
  it("writes durations the way people say them", () => {
    expect(formatMinutes(480)).toBe("8h");
    expect(formatMinutes(465)).toBe("7h 45m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(0)).toBe("0m");
  });

  it("writes each unit in its own terms", () => {
    expect(formatAmount(requireMetric("sleep"), 465)).toBe("7h 45m");
    expect(formatAmount(requireMetric("steps"), 8000)).toBe("8,000");
    expect(formatAmount(requireMetric("produce"), 800)).toBe("800g");
  });

  it("writes progress as a fraction of the target", () => {
    expect(formatProgress(requireMetric("steps"), 5200, 8000)).toBe("5,200 of 8,000");
    expect(formatProgress(requireMetric("produce"), 650, 800)).toBe("650 of 800g");
    expect(formatProgress(requireMetric("sleep"), 450, 480)).toBe("7h 30m of 8h");
    expect(formatProgress(requireMetric("outdoor"), 1, 2)).toBe("1 of 2 blocks");
    expect(formatProgress(requireMetric("training"), 5, 8)).toBe("5 of 8 sessions");
  });

  it("writes a session entry as its length, not as a count of sessions", () => {
    // An 80-minute block is 80 minutes. Reporting it as "80 sessions" is what
    // happens when the unit an entry is recorded in gets confused with the
    // unit the target counts.
    expect(formatAmount(requireMetric("outdoor"), 80)).toBe("1h 20m");
    expect(formatAmount(requireMetric("training"), 45)).toBe("45m");
    expect(formatPreset(requireMetric("outdoor"), 80)).toBe("+1h 20m");
  });

  it("still counts the target in blocks and sessions", () => {
    // The other half of the same distinction: progress counts blocks.
    expect(formatProgress(requireMetric("outdoor"), 1, 2)).toBe("1 of 2 blocks");
    expect(formatProgress(requireMetric("training"), 5, 8)).toBe("5 of 8 sessions");
  });

  it("shows the amount alone when protein has no target yet", () => {
    expect(formatProgress(requireMetric("protein"), 90, null)).toBe("90g");
  });

  it("round-trips a typed amount back to what was typed", () => {
    for (const [id, typed] of [
      ["sleep", "7h 45m"],
      ["steps", "8,000"],
      ["produce", "800g"],
    ] as const) {
      const metric = requireMetric(id);
      expect(formatAmount(metric, parseAmountFor(metric, typed))).toBe(typed);
    }
  });
});
