/**
 * Turning entries into "where am I today".
 *
 * Pure: it takes entries and gives back numbers, so the same code runs on the
 * server for the dashboard and in tests without a database.
 */

import { addDays, endOfWeek, startOfWeek } from "./dates";
import { targetFor, type Cadence, type Metric } from "./metrics";

export interface Entry {
  metricId: string;
  date: string;
  amount: number;
}

export interface Window {
  from: string;
  to: string;
  /** How the period reads on screen. */
  label: string;
}

/**
 * The stretch of days a metric is judged over, relative to a given day.
 *
 * The fortnight is rolling rather than fixed: with a calendar fortnight, a
 * missed week is forgiven the moment the page turns, which is the opposite of
 * what the target is for.
 */
export function windowFor(cadence: Cadence, on: string): Window {
  switch (cadence) {
    case "daily":
      return { from: on, to: on, label: "today" };
    case "weekly":
      return { from: startOfWeek(on), to: endOfWeek(on), label: "this week" };
    case "rolling14":
      return { from: addDays(on, -13), to: on, label: "last 14 days" };
  }
}

export interface Progress {
  metric: Metric;
  window: Window;
  /** Total amount, or qualifying session count. */
  value: number;
  /** Null when protein has no body weight to work from. */
  target: number | null;
  /** 0 to 1, capped. Null when there is no target. */
  fraction: number | null;
  met: boolean;
  /** What is still to do, in the metric's unit. Zero once met. */
  remaining: number | null;
  /**
   * Entries too short to count, for metrics that need a minimum. Worth
   * surfacing: three 40-minute walks look like progress and are not.
   */
  shortOfQualifying: number;
}

/** Where one person stands on one metric, on a given day. */
export function progressFor(
  metric: Metric,
  entries: Entry[],
  on: string,
  weightLb: number | null,
): Progress {
  const window = windowFor(metric.cadence, on);
  const inWindow = entries.filter(
    (e) => e.metricId === metric.id && e.date >= window.from && e.date <= window.to,
  );

  const minimum = metric.qualifyingAmount ?? 0;
  const value =
    metric.measure === "sessions"
      ? inWindow.filter((e) => e.amount >= minimum).length
      : inWindow.reduce((sum, e) => sum + e.amount, 0);

  const shortOfQualifying =
    metric.measure === "sessions" && minimum > 0
      ? inWindow.filter((e) => e.amount < minimum).length
      : 0;

  const target = targetFor(metric, weightLb);
  const met = target != null && value >= target;

  return {
    metric,
    window,
    value,
    target,
    fraction: target == null || target <= 0 ? null : Math.min(1, value / target),
    met,
    remaining: target == null ? null : Math.max(0, target - value),
    shortOfQualifying,
  };
}

/** All eight, in their listed order. */
export function progressForAll(
  metrics: Metric[],
  entries: Entry[],
  on: string,
  weightLb: number | null,
): Progress[] {
  return metrics.map((metric) => progressFor(metric, entries, on, weightLb));
}

/** How many of the eight are met, for the headline. */
export function countMet(all: Progress[]): { met: number; total: number } {
  return { met: all.filter((p) => p.met).length, total: all.length };
}

/**
 * Whether every daily target was met on a given day.
 *
 * Only the daily ones: a weekly total cannot be judged on a Tuesday, so a
 * day's mark reflects the five things that day is actually responsible for.
 */
export function dailyEightsMet(
  dailyMetrics: Metric[],
  entries: Entry[],
  on: string,
  weightLb: number | null,
): { met: number; total: number } {
  const results = dailyMetrics.map((m) => progressFor(m, entries, on, weightLb));
  return { met: results.filter((p) => p.met).length, total: results.length };
}

/**
 * A run of days ending today where every daily target was met.
 *
 * Today is not counted against you while it is still going: a streak ends on
 * the last completed day, so an unfinished today does not read as a break.
 */
export function currentStreak(
  dailyMetrics: Metric[],
  entries: Entry[],
  on: string,
  weightLb: number | null,
): number {
  let streak = 0;
  let cursor = on;

  // Today only extends a streak once it is complete; it never breaks one.
  const todayResult = dailyEightsMet(dailyMetrics, entries, cursor, weightLb);
  if (todayResult.met === todayResult.total && todayResult.total > 0) streak++;
  cursor = addDays(cursor, -1);

  // Stop at a year: a personal tracker has no use for a longer count, and it
  // bounds the work on a database that has been running for years.
  for (let guard = 0; guard < 365; guard++) {
    const result = dailyEightsMet(dailyMetrics, entries, cursor, weightLb);
    if (result.total === 0 || result.met < result.total) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
