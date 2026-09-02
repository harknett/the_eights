import { EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { getStore } from "@/lib/db";
import { relativeDate } from "@/lib/dates";
import { formatAmount, getMetric } from "@/lib/metrics";

import { removeEntry } from "../actions";

export const metadata = { title: "Log · The Eights" };

export default async function LogPage() {
  const user = await requireUser();
  const entries = getStore().recentEntries(user.id, 200);

  // Grouped by day, because that is how anyone reads back over their own log.
  const byDate = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Log" subtitle="Everything you have recorded, newest first." />

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Add something from Today and it will collect here."
        />
      ) : (
        [...byDate].map(([date, forDate]) => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-medium text-muted">{relativeDate(date)}</h2>
            <ul className="card divide-y divide-[var(--border)] overflow-hidden p-0">
              {forDate.map((entry) => {
                const metric = getMetric(entry.metricId);
                return (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{metric?.label ?? entry.metricId}</p>
                      {entry.notes ? (
                        <p className="truncate text-xs text-muted">{entry.notes}</p>
                      ) : null}
                    </div>
                    <span className="tabular shrink-0 font-medium">
                      {metric ? formatAmount(metric, entry.amount) : entry.amount}
                    </span>
                    <form action={removeEntry}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        aria-label={`Remove ${metric?.label ?? "entry"} on ${entry.date}`}
                        className="rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-danger"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
