import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { getStore } from "@/lib/db";
import { addDays, isIsoDate, longDate, relativeDate, today } from "@/lib/dates";
import { METRICS, metricsByCadence } from "@/lib/metrics";
import { countMet, currentStreak, progressForAll } from "@/lib/progress";

export const metadata = { title: "Today · The Eights" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const now = today();
  // Looking back at an earlier day is allowed; looking ahead is not, since
  // there is nothing to log for a day that has not happened.
  const requested = params.date && isIsoDate(params.date) ? params.date : now;
  const date = requested > now ? now : requested;

  const store = getStore();

  // A fortnight covers the longest window any metric looks back over, so one
  // read serves every card on the page. A year covers the streak.
  const entries = store.entriesBetween(user.id, addDays(date, -365), date);

  const all = progressForAll(METRICS, entries, date, user.weightLb);
  const { met, total } = countMet(all);
  const streak = currentStreak(metricsByCadence("daily"), entries, date, user.weightLb);

  const daily = all.filter((p) => p.metric.cadence === "daily");
  const weekly = all.filter((p) => p.metric.cadence === "weekly");
  const fortnightly = all.filter((p) => p.metric.cadence === "rolling14");

  const isToday = date === now;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isToday ? "Today" : relativeDate(date, now)}
        subtitle={longDate(date)}
      />

      <section className="card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">On track</p>
            <p className="tabular text-3xl font-semibold">
              {met}
              <span className="text-muted text-xl"> of {total}</span>
            </p>
          </div>
          {streak > 0 ? (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted">Full days in a row</p>
              <p className="tabular text-3xl font-semibold text-accent">{streak}</p>
            </div>
          ) : null}
        </div>

        <nav className="mt-3 flex items-center justify-between text-sm">
          <Link href={`/?date=${addDays(date, -1)}`} className="text-accent underline">
            ← {relativeDate(addDays(date, -1), now)}
          </Link>
          {!isToday ? (
            <Link href="/" className="text-accent underline">
              Back to today
            </Link>
          ) : (
            <span className="text-muted">Logging for today</span>
          )}
        </nav>
      </section>

      <Group title="Every day" progresses={daily} date={date} />
      <Group
        title="This week"
        note="Monday to Sunday."
        progresses={weekly}
        date={date}
      />
      <Group
        title="Rolling fortnight"
        note="The last 14 days, so a quiet week has to be made up rather than forgiven."
        progresses={fortnightly}
        date={date}
      />

      {user.weightLb == null ? (
        <p className="text-sm text-muted">
          Protein is 0.8g for every pound you weigh.{" "}
          <Link href="/settings" className="text-accent underline">
            Add your weight
          </Link>{" "}
          to give it a target.
        </p>
      ) : null}
    </div>
  );
}

function Group({
  title,
  note,
  progresses,
  date,
}: {
  title: string;
  note?: string;
  progresses: Array<React.ComponentProps<typeof MetricCard>["progress"]>;
  date: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {note ? <p className="text-xs text-muted mt-0.5">{note}</p> : null}
      </div>
      <div className="space-y-3">
        {progresses.map((progress) => (
          <MetricCard key={progress.metric.id} progress={progress} date={date} />
        ))}
      </div>
    </section>
  );
}
