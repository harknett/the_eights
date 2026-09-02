/**
 * Reading the numbers people actually type.
 *
 * Nothing here rounds silently or guesses: an input it cannot read is refused
 * with a message naming what it expected, because a mistyped entry that is
 * quietly accepted as the wrong number is worse than one that is rejected.
 */

import type { Metric } from "./metrics";

/** Minutes, from the several ways a length of time gets written. */
export function parseMinutes(input: string, bareNumberIs: "hours" | "minutes"): number {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (s === "") throw new Error("Enter an amount.");

  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(s);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const hoursAndMinutes = /^(\d+(?:\.\d+)?)h(?:(\d{1,2})m?)?$/.exec(s);
  if (hoursAndMinutes) {
    return Math.round(Number(hoursAndMinutes[1]) * 60 + Number(hoursAndMinutes[2] ?? 0));
  }

  const minutesOnly = /^(\d+(?:\.\d+)?)m(?:in(?:s|utes)?)?$/.exec(s);
  if (minutesOnly) return Math.round(Number(minutesOnly[1]));

  const bare = /^\d+(?:\.\d+)?$/.exec(s);
  if (bare) {
    const value = Number(bare[0]);
    return Math.round(bareNumberIs === "hours" ? value * 60 : value);
  }

  throw new Error(`"${input}" is not a length of time. Try 45m, 1h 30m, or 1:30.`);
}

/** A whole count, tolerating the separators people paste in from a phone. */
export function parseCount(input: string, label: string): number {
  const s = input.trim().replace(/[,\s]/g, "");
  if (s === "") throw new Error("Enter an amount.");
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`"${input}" is not a number of ${label}.`);
  const value = Math.round(Number(s));
  if (!Number.isSafeInteger(value)) throw new Error("That number is too large.");
  return value;
}

/** Grams, with or without the unit written out. */
export function parseGrams(input: string): number {
  const s = input.trim().toLowerCase().replace(/[,\s]/g, "").replace(/g(rams?)?$/, "");
  return parseCount(s, "grams");
}

/** Read one entry for a metric, in that metric's own unit. */
export function parseAmountFor(metric: Metric, input: string): number {
  const value = (() => {
    switch (metric.amountUnit) {
      case "minutes":
        return parseMinutes(input, metric.bareNumberIs ?? "minutes");
      case "steps":
        return parseCount(input, "steps");
      case "grams":
        return parseGrams(input);
    }
  })();

  if (value <= 0) throw new Error("Enter an amount greater than zero.");
  if (value > 1_000_000) throw new Error("That is larger than this tracks.");
  return value;
}
