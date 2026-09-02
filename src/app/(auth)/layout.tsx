import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-4xl font-semibold tracking-tight text-accent" aria-hidden>
            8
          </p>
          <h1 className="text-xl font-semibold tracking-tight">The Eights</h1>
          <p className="text-sm text-muted">Eight things a day, a week, a fortnight.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
