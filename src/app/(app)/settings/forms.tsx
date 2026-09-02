"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  addPerson,
  changePassword,
  resetPersonPassword,
  saveProfile,
  type ResetState,
  type SettingsState,
} from "./actions";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

function Submit({ label, full = false }: { label: string; full?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending} className={full ? "w-full" : ""}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Success({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5 text-sm text-accent">
      {message}
    </p>
  );
}

export function ProfileForm({ name, weightLb }: { name: string; weightLb: number | null }) {
  const [state, action] = useActionState<SettingsState, FormData>(saveProfile, {});

  return (
    <Card>
      <form action={action} className="space-y-4">
        <h2 className="font-semibold">You</h2>
        <ErrorBanner message={state.error} />
        <Success message={state.success} />

        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
        </Field>

        <Field
          label="Body weight in pounds"
          htmlFor="weightLb"
          hint="Only used for the protein target: 0.8g for every pound. Leave blank to skip it."
        >
          <Input
            id="weightLb"
            name="weightLb"
            inputMode="decimal"
            placeholder="165"
            defaultValue={weightLb != null ? String(weightLb) : ""}
            className="tabular"
          />
        </Field>

        <Submit label="Save" />
      </form>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, {});

  return (
    <Card>
      <form action={action} className="space-y-4">
        <h2 className="font-semibold">Change your password</h2>
        <ErrorBanner message={state.error} />
        <Success message={state.success} />

        <Field label="Current password" htmlFor="currentPassword">
          <Input id="currentPassword" name="currentPassword" type="password"
            autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="newPassword" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH} required />
        </Field>
        <Submit label="Update password" />
      </form>
    </Card>
  );
}

export function AddPersonForm() {
  const [state, action] = useActionState<SettingsState, FormData>(addPerson, {});

  return (
    <Card>
      <form action={action} className="space-y-4">
        <div>
          <h2 className="font-semibold">Add someone</h2>
          <p className="text-sm text-muted mt-0.5">
            Everyone tracks their own eight. Nobody sees anybody else&rsquo;s numbers.
          </p>
        </div>
        <ErrorBanner message={state.error} />
        <Success message={state.success} />

        <Field label="Name" htmlFor="new-name">
          <Input id="new-name" name="name" autoComplete="off" required />
        </Field>
        <Field label="Email" htmlFor="new-email">
          <Input id="new-email" name="email" type="email" autoComplete="off"
            autoCapitalize="none" required />
        </Field>
        <Field label="Temporary password" htmlFor="new-password"
          hint="Give it to them directly; they will choose their own at first sign-in.">
          <Input id="new-password" name="password" type="text" autoComplete="off"
            minLength={MIN_PASSWORD_LENGTH} required />
        </Field>
        <Submit label="Add them" />
      </form>
    </Card>
  );
}

/**
 * Reset one person's password. The generated password appears here once and
 * nowhere else - it is not stored in the clear, so a lost one means another
 * reset rather than a lookup.
 */
export function ResetPasswordButton({ userId, name }: { userId: number; name: string }) {
  const [state, action] = useActionState<ResetState, FormData>(resetPersonPassword, {});

  if (state.temporaryPassword) {
    return (
      <div className="mt-2 rounded-xl border border-accent/40 bg-accent-soft p-3 space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-accent">
          Temporary password for {state.forName}
        </p>
        <p className="font-mono text-lg font-semibold tracking-wide select-all">
          {state.temporaryPassword}
        </p>
        <p className="text-xs text-muted">
          Shown once. Give it to them directly — they will choose their own at sign-in, and any
          device they were signed in on has been signed out.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="userId" value={userId} />
      <ErrorBanner message={state.error} />
      <ResetSubmit name={name} />
    </form>
  );
}

function ResetSubmit({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-muted underline hover:text-danger disabled:opacity-50"
    >
      {pending ? "Resetting…" : `Reset ${name.split(" ")[0]}'s password`}
    </button>
  );
}
