import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/nav";
import { requireUser } from "@/lib/auth/guard";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2 font-semibold tracking-tight">
            <span className="text-xl text-accent" aria-hidden>
              8
            </span>
            <span>The Eights</span>
          </Link>
          <div className="ml-auto">
            <AppNav name={user.name} />
          </div>
        </div>
      </header>

      {/* Bottom padding clears the fixed bar on a phone. */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 pb-28 md:pb-8">{children}</main>
    </>
  );
}
