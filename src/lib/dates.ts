/** All dates are local-time YYYY-MM-DD strings. */

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return formatDate(new Date());
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function requireIsoDate(value: string, field = "Date"): string {
  const trimmed = value.trim();
  if (!isIsoDate(trimmed)) throw new Error(`${field} must be a real date in YYYY-MM-DD form.`);
  return trimmed;
}

/**
 * Move a date by whole days.
 *
 * Goes through a local Date rather than adding milliseconds, so a day either
 * side of the clocks changing is still one day.
 */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDate(dt);
}

/** 0 is Sunday, matching JavaScript's getDay(). */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).getDay();
}

/**
 * The Monday on or before a date.
 *
 * Weeks run Monday to Sunday: a week of habits that resets mid-weekend would
 * split "the weekend" in half, which is when most outdoor play happens.
 */
export function startOfWeek(isoDate: string): string {
  const day = weekdayOf(isoDate);
  const back = day === 0 ? 6 : day - 1;
  return addDays(isoDate, -back);
}

export function endOfWeek(isoDate: string): string {
  return addDays(startOfWeek(isoDate), 6);
}

/** Every date from `from` to `to` inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) out.push(cursor);
  return out;
}

/** "2026-09-02" -> "Wed 2 Sep" */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "2026-09-02" -> "September 2, 2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "today", "yesterday", or the short form. */
export function relativeDate(iso: string, from: string = today()): string {
  if (iso === from) return "today";
  if (iso === addDays(from, -1)) return "yesterday";
  return shortDate(iso);
}
