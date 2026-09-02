import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/nav";
import { requireUser } from "@/lib/auth/guard";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <>
      {/*
        Added to a home screen this runs standalone with viewportFit: cover,
        so the header sits under the status bar and the notch unless it is told
        about the safe area. In a browser tab these insets are zero.
      */}
      <header
        className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold tracking-tight">
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

      {/* Clears the home indicator; there is no fixed bar to allow for. */}
      <main
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-5"
        style={{
          paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {children}
      </main>
    </>
  );
}
