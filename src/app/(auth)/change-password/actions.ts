"use server";

import { redirect } from "next/navigation";

import { requireSignedIn } from "@/lib/auth/guard";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export interface ChangePasswordState {
  error?: string;
}

/**
 * Choose a password for an account holding one somebody else set. Uses
 * requireSignedIn: requireUser would bounce the caller straight back here.
 */
export async function choosePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireSignedIn();

  try {
    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    const store = getStore();
    const record = store.findUserByEmail(user.email);
    if (!record || !(await verifyPassword(current, record.passwordHash))) {
      return { error: "That temporary password is not correct." };
    }

    validatePassword(next);
    if (next !== confirm) return { error: "The two new passwords do not match." };
    if (next === current) return { error: "Choose a password different from the temporary one." };

    store.setPassword(user.id, await hashPassword(next), false);
    // End anything signed in with the temporary password, then reissue this one.
    store.deleteUserSessions(user.id);
    await startSession(user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not set the password." };
  }

  redirect("/");
}
