/**
 * The eight.
 *
 * Every target is a form of the number eight, but they are not all the same
 * shape, and the differences matter:
 *
 *   - Most are a total to reach in a day, built up from however many entries
 *     it takes. 800g of vegetables arrives a handful at a time.
 *   - Training is counted over a rolling fortnight rather than a fixed one, so
 *     a quiet week has to be made up rather than wiped by the calendar.
 *   - Outdoor play is not 160 minutes a week; it is two blocks of eighty. A
 *     dozen ten-minute walks is a different thing, so short entries count
 *     towards nothing.
 *   - Protein is the only target that differs per person, because it is
 *     0.8g for every pound they weigh.
 */

export type Cadence = "daily" | "weekly" | "rolling14";

/**
 * How entries turn into progress.
 *
 *   total    - add up the amounts
 *   sessions - count the entries that are long enough to qualify
 */
export type Measure = "total" | "sessions";

export interface Metric {
  /** Stable key stored on every entry. Never rename these. */
  id: string;
  label: string;
  /** The eight it comes from, shown as the metric's own subtitle. */
  rule: string;
  cadence: Cadence;
  measure: Measure;
  /** Fixed target, or null when it is worked out per person (protein). */
  target: number | null;
  /**
   * What one entry's `amount` measures.
   *
   * Distinct from what the target counts: an outdoor block is recorded as the
   * minutes it lasted, while the target counts blocks. Conflating the two made
   * an 80-minute walk report itself as "80 sessions".
   */
  amountUnit: "minutes" | "steps" | "grams";
  /** For sessions: the smallest entry that counts. */
  qualifyingAmount?: number;
  /**
   * What a bare number means when the unit is minutes.
   *
   * Typing "8" against sleep means eight hours; typing "8" against mobility
   * means eight minutes. Same unit, opposite intent, so each metric says which
   * it expects rather than the parser guessing.
   */
  bareNumberIs?: "hours" | "minutes";
  /** Sensible one-tap amounts for the quick-add buttons. */
  presets: number[];
  /** Placeholder for the free-entry box. */
  placeholder: string;
}

export const METRICS: Metric[] = [
  {
    id: "sleep",
    label: "Time in bed",
    rule: "8 hours a day",
    cadence: "daily",
    measure: "total",
    target: 8 * 60,
    amountUnit: "minutes",
    bareNumberIs: "hours",
    presets: [7 * 60, 7.5 * 60, 8 * 60, 8.5 * 60],
    placeholder: "7h 45m",
  },
  {
    id: "steps",
    label: "Steps",
    rule: "8,000 a day",
    cadence: "daily",
    measure: "total",
    target: 8000,
    amountUnit: "steps",
    presets: [1000, 2500, 5000, 8000],
    placeholder: "8000",
  },
  {
    id: "produce",
    label: "Fruit & veg",
    rule: "800g a day",
    cadence: "daily",
    measure: "total",
    target: 800,
    amountUnit: "grams",
    presets: [80, 150, 200, 300],
    placeholder: "150",
  },
  {
    id: "protein",
    label: "Protein",
    rule: "0.8g per pound you weigh",
    cadence: "daily",
    measure: "total",
    // Worked out from body weight; see proteinTarget below.
    target: null,
    amountUnit: "grams",
    presets: [20, 30, 40, 50],
    placeholder: "30",
  },
  {
    id: "mobility",
    label: "Mobility",
    rule: "8 minutes a day",
    cadence: "daily",
    measure: "total",
    target: 8,
    amountUnit: "minutes",
    presets: [5, 8, 10, 15],
    placeholder: "8",
  },
  {
    id: "training",
    label: "Training",
    rule: "8 sessions a fortnight",
    cadence: "rolling14",
    measure: "sessions",
    target: 8,
    // A session is recorded by how long it ran; the target counts sessions.
    amountUnit: "minutes",
    // Any session counts; the amount is its length, kept for interest.
    qualifyingAmount: 0,
    presets: [30, 45, 60, 90],
    placeholder: "45",
  },
  {
    id: "outdoor",
    label: "Outdoor play",
    rule: "two 80-minute blocks a week",
    cadence: "weekly",
    measure: "sessions",
    target: 2,
    // A block is recorded by its length; the target counts qualifying blocks.
    amountUnit: "minutes",
    // Eighty minutes is the point of it: shorter outings do not count.
    qualifyingAmount: 80,
    presets: [80, 90, 120, 180],
    placeholder: "90",
  },
  {
    id: "people",
    label: "Time with your people",
    rule: "180 minutes a week",
    cadence: "weekly",
    measure: "total",
    target: 180,
    amountUnit: "minutes",
    presets: [30, 60, 90, 120],
    placeholder: "60",
  },
];

const BY_ID = new Map(METRICS.map((m) => [m.id, m]));

export function getMetric(id: string): Metric | undefined {
  return BY_ID.get(id);
}

export function requireMetric(id: string): Metric {
  const metric = BY_ID.get(id);
  if (!metric) throw new Error(`Unknown metric: "${id}".`);
  return metric;
}

export function metricsByCadence(cadence: Cadence): Metric[] {
  return METRICS.filter((m) => m.cadence === cadence);
}

/** 0.8g of protein for every pound. Null until a weight is set. */
export function proteinTarget(weightLb: number | null): number | null {
  if (weightLb == null || weightLb <= 0) return null;
  return Math.round(weightLb * 0.8);
}

/** The target for one person, which only protein varies. */
export function targetFor(metric: Metric, weightLb: number | null): number | null {
  return metric.id === "protein" ? proteinTarget(weightLb) : metric.target;
}

// --- formatting -----------------------------------------------------------

/** 450 -> "7h 30m", 45 -> "45m" */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** One entry, in the unit it was recorded in. */
export function formatAmount(metric: Metric, amount: number): string {
  switch (metric.amountUnit) {
    case "minutes":
      return formatMinutes(amount);
    case "steps":
      return amount.toLocaleString("en-US");
    case "grams":
      return `${Math.round(amount).toLocaleString("en-US")}g`;
  }
}

/** How a progress figure reads: "5,200 of 8,000", "1 of 2 blocks". */
export function formatProgress(metric: Metric, value: number, target: number | null): string {
  if (target == null) return formatAmount(metric, value);
  if (metric.measure === "sessions") {
    const noun = metric.id === "outdoor" ? "blocks" : "sessions";
    return `${value} of ${target} ${noun}`;
  }
  if (metric.amountUnit === "minutes") return `${formatMinutes(value)} of ${formatMinutes(target)}`;
  if (metric.amountUnit === "grams") {
    return `${Math.round(value).toLocaleString("en-US")} of ${target.toLocaleString("en-US")}g`;
  }
  return `${value.toLocaleString("en-US")} of ${target.toLocaleString("en-US")}`;
}

/** What a quick-add button says: "+30m", "+2,500", "+150g". */
export function formatPreset(metric: Metric, amount: number): string {
  return `+${formatAmount(metric, amount)}`;
}
