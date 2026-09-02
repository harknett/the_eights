"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ProgressRing } from "./ui";
import { logEntry, type LogState } from "@/app/(app)/actions";
import {
  formatAmount,
  formatPreset,
  formatProgress,
  type Metric,
} from "@/lib/metrics";
import type { Progress } from "@/lib/progress";

/**
 * One of the eight, with everything needed to move it along.
 *
 * The quick-add buttons are the point: logging 150g of vegetables should take
 * one tap, not a form. The free-entry box is there for the times the presets
 * do not fit, and stays out of the way until it is wanted.
 */
export function MetricCard({ progress, date }: { progress: Progress; date: string }) {
  const { metric, target, value, met, fraction, shortOfQualifying } = progress;
  const [state, action] = useActionState<LogState, FormData>(logEntry, {});
  const [showCustom, setShowCustom] = useState(false);

  // The action is shared by every card, so only show a message on the one it
  // belongs to.
  const mine = state.metricId === metric.id;

  return (
    <div className={`card p-4 ${met ? "border-done/40" : ""}`}>
      <div className="flex items-center gap-3">
        <ProgressRing fraction={fraction} met={met} size={52}>
          {met ? (
            <span className="text-done" aria-hidden>
              ✓
            </span>
          ) : target != null ? (
            <span className="tabular text-muted">{Math.round((fraction ?? 0) * 100)}</span>
          ) : (
            <span className="text-muted" aria-hidden>
              –
            </span>
          )}
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{metric.label}</p>
          <p className="text-sm text-muted">
            {target == null ? (
              <>Set your weight to see this target</>
            ) : (
              formatProgress(metric, value, target)
            )}
          </p>
          <p className="text-xs text-muted mt-0.5">{metric.rule}</p>
        </div>
      </div>

      {shortOfQualifying > 0 ? (
        <p className="mt-2 text-xs text-muted">
          {shortOfQualifying} shorter {shortOfQualifying === 1 ? "outing" : "outings"} logged, which{" "}
          {shortOfQualifying === 1 ? "does" : "do"} not count towards a block.
        </p>
      ) : null}

      {mine && state.error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      {mine && state.addedAmount != null && !state.error ? (
        <p className="mt-2 text-xs text-accent">Added {formatAmount(metric, state.addedAmount)}.</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {metric.presets.map((amount) => (
          <PresetButton key={amount} metric={metric} amount={amount} date={date} action={action} />
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((open) => !open)}
          aria-expanded={showCustom}
          className="rounded-lg border border-line bg-surface min-h-9 px-3 text-sm text-muted hover:bg-surface-muted"
        >
          {showCustom ? "Close" : "Other…"}
        </button>
      </div>

      {showCustom ? (
        <form action={action} className="mt-3 flex gap-2">
          <input type="hidden" name="metricId" value={metric.id} />
          <input type="hidden" name="date" value={date} />
          <input
            name="amount"
            inputMode={metric.amountUnit === "steps" || metric.amountUnit === "grams" ? "numeric" : "text"}
            placeholder={metric.placeholder}
            required
            autoFocus
            className="tabular min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <CustomSubmit />
        </form>
      ) : null}
    </div>
  );
}

function PresetButton({
  metric,
  amount,
  date,
  action,
}: {
  metric: Metric;
  amount: number;
  date: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="metricId" value={metric.id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="amount" value={String(amount)} />
      <PresetSubmit label={formatPreset(metric, amount)} />
    </form>
  );
}

function PresetSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tabular rounded-lg border border-accent/40 bg-accent-soft text-accent min-h-9 px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-white disabled:opacity-50 dark:hover:text-[#14161a]"
    >
      {label}
    </button>
  );
}

function CustomSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-accent px-4 min-h-11 font-medium text-white disabled:opacity-50 dark:text-[#14161a]"
    >
      {pending ? "…" : "Add"}
    </button>
  );
}
