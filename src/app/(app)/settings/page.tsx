import { signOut } from "@/app/(auth)/actions";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { dataDir, getStore } from "@/lib/db";
import { proteinTarget } from "@/lib/metrics";

import { AddPersonForm, ChangePasswordForm, ProfileForm, ResetPasswordButton } from "./forms";

export const metadata = { title: "Settings · The Eights" };

export default async function SettingsPage() {
  const user = await requireUser();
  const store = getStore();
  const people = store.listUsers();
  const target = proteinTarget(user.weightLb);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle={
          target != null
            ? `Your protein target is ${target}g a day.`
            : "Add your weight to give protein a target."
        }
      />

      <ProfileForm name={user.name} weightLb={user.weightLb} />
      <ChangePasswordForm />

      <section className="space-y-3">
        <h2 className="font-semibold">In this household ({people.length})</h2>
        <ul className="card divide-y divide-[var(--border)] overflow-hidden p-0">
          {people.map((person) => (
            <li key={person.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {person.name}
                    {person.id === user.id ? <span className="text-muted"> (you)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted">{person.email}</p>
                </div>
                {person.mustChangePassword ? (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">
                    must set password
                  </span>
                ) : null}
                <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted">
                  {person.role}
                </span>
              </div>
              {user.role === "owner" && person.id !== user.id ? (
                <ResetPasswordButton userId={person.id} name={person.name} />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {user.role === "owner" ? <AddPersonForm /> : null}

      <Card className="space-y-2">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-muted">
          Everything lives in one SQLite file. Back up that directory and you have backed up the
          household&rsquo;s tracking.
        </p>
        <p className="rounded-lg bg-surface-muted px-3 py-2 font-mono text-xs break-all">
          {dataDir()}
        </p>
        <form action={signOut} className="pt-2">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
