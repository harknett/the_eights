import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

import { SignInForm } from "./form";

export const metadata = { title: "Sign in · The Eights" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  // Nobody to sign in as yet: go and set the household up.
  if (getStore().countUsers() === 0) redirect("/register");

  return (
    <>
      <SignInForm />
      <p className="text-center text-xs text-muted leading-relaxed">
        Forgotten your password? Whoever set this up can reset it from Settings.
        <br />
        If that is you, run <code className="font-mono">npm run set-password</code> on the machine
        it runs on.
      </p>
    </>
  );
}
