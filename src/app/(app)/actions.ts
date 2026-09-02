"use server";

import { revalidatePath } from "next/cache";

import { parseAmountFor } from "@/lib/amounts";
import { requireUser } from "@/lib/auth/guard";
import { getStore } from "@/lib/db";
import { requireIsoDate, today } from "@/lib/dates";
import { requireMetric } from "@/lib/metrics";

export interface LogState {
  error?: string;
  /** Which metric the message belongs to, so only that card shows it. */
  metricId?: string;
  addedAmount?: number;
  /** Unique per success, so a form can remount itself clear. */
  savedAt?: number;
}

function readDate(formData: FormData): string {
  const raw = String(formData.get("date") ?? "").trim();
  return raw === "" ? today() : requireIsoDate(raw);
}

/**
 * Add to one of the eight.
 *
 * Every entry is its own row rather than a running total being edited: the
 * day's 800g of vegetables is a record of what was eaten, not a number that
 * gets overwritten, so a mistake can be removed without retyping the rest.
 */
export async function logEntry(_prev: LogState, formData: FormData): Promise<LogState> {
  const user = await requireUser();
  const metricId = String(formData.get("metricId") ?? "");

  try {
    const metric = requireMetric(metricId);
    const amount = parseAmountFor(metric, String(formData.get("amount") ?? ""));
    const notesRaw = String(formData.get("notes") ?? "").trim();

    getStore().addEntry({
      userId: user.id,
      metricId: metric.id,
      date: readDate(formData),
      amount,
      notes: notesRaw === "" ? null : notesRaw,
    });

    revalidatePath("/");
    revalidatePath("/log");
    return { metricId, addedAmount: amount, savedAt: Date.now() };
  } catch (err) {
    return {
      metricId,
      error: err instanceof Error ? err.message : "Could not save that.",
    };
  }
}

export async function removeEntry(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("entryId"));
  if (!Number.isInteger(id)) throw new Error("Invalid entry.");

  // Scoped to the owner: nobody edits somebody else's log.
  getStore().deleteEntry(id, user.id);

  revalidatePath("/");
  revalidatePath("/log");
}
