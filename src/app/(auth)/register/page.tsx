import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";

import { RegisterForm } from "./form";

export const metadata = { title: "Set up · The Eights" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/");
  // A one-time bootstrap; after that the owner adds people from Settings.
  if (getStore().countUsers() > 0) redirect("/login");

  return (
    <>
      <p className="text-center text-sm text-muted">
        Setting this up for the household. You can add everyone else afterwards.
      </p>
      <RegisterForm />
    </>
  );
}
