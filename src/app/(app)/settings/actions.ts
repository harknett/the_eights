"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guard";
import {
  generateTemporaryPassword,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

export interface SettingsState {
  error?: string;
  success?: string;
}

export interface ResetState {
  error?: string;
  /** Shown once, never stored. */
  temporaryPassword?: string;
  forName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Name and body weight. The weight is what gives protein a target. */
export async function saveProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();

  try {
    const name = String(formData.get("name") ?? "").trim();
    if (name === "") return { error: "Name is required." };

    const weightRaw = String(formData.get("weightLb") ?? "").trim();
    let weightLb: number | null = null;
    if (weightRaw !== "") {
      weightLb = Number(weightRaw.replace(/[,\s]|lbs?$/gi, ""));
      if (!Number.isFinite(weightLb) || weightLb <= 0) {
        return { error: "Enter your weight in pounds, or leave it blank." };
      }
      if (weightLb > 1000) return { error: "That weight looks like a typo." };
    }

    const store = getStore();
    store.setName(user.id, name);
    store.setWeight(user.id, weightLb);

    revalidatePath("/");
    revalidatePath("/settings");
    return {
      success:
        weightLb == null
          ? "Saved. Without a weight, protein has no target."
          : `Saved. Your protein target is ${Math.round(weightLb * 0.8)}g a day.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save that." };
  }
}

export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const actor = await requireUser();

  try {
    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");

    const store = getStore();
    const record = store.findUserByEmail(actor.email);
    if (!record || !(await verifyPassword(current, record.passwordHash))) {
      return { error: "Your current password is not correct." };
    }

    validatePassword(next);
    if (next === current) return { error: "The new password matches the old one." };

    store.setPassword(actor.id, await hashPassword(next), false);
    // A change should end any other session using the old password.
    store.deleteUserSessions(actor.id);
    await startSession(actor.id);

    return { success: "Password updated. Any other device was signed out." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change the password." };
  }
}

/** Only whoever set the household up can add people. */
export async function addPerson(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only the household owner can add people." };

  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
    if (name === "") return { error: "Name is required." };
    validatePassword(password);

    const store = getStore();
    if (store.findUserByEmail(email)) return { error: `${email} already has an account.` };

    store.createUser({
      email,
      name,
      passwordHash: await hashPassword(password),
      role: "member",
      // Somebody else chose it, so they pick their own at first sign-in.
      mustChangePassword: true,
    });

    revalidatePath("/settings");
    return {
      success: `${name} can sign in now. Give them the password directly — they will be asked to choose their own.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add them." };
  }
}

/**
 * Reset somebody's password to a fresh temporary one, shown once. Every
 * session that account had is ended, and it is held at the change-password
 * page until it picks its own.
 */
export async function resetPersonPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const actor = await requireUser();
  if (actor.role !== "owner") return { error: "Only the household owner can reset a password." };

  try {
    const userId = Number(formData.get("userId"));
    if (!Number.isInteger(userId)) return { error: "Invalid account." };

    const store = getStore();
    const target = store.getUser(userId);
    if (!target) return { error: "That account no longer exists." };

    const temporaryPassword = generateTemporaryPassword();
    store.setPassword(userId, await hashPassword(temporaryPassword), true);
    store.deleteUserSessions(userId);

    revalidatePath("/settings");
    return { temporaryPassword, forName: target.name };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reset the password." };
  }
}
