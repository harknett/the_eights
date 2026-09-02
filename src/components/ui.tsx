import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-12 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

/*
  Each carries an active state as well as a hover one. Tailwind gates hover
  behind a device that can hover, and the base stylesheet clears the tap
  highlight, so without :active a tap on a phone would show nothing at all
  until the server answered.
*/
const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-strong active:bg-accent-strong dark:text-[#14161a]",
  secondary: "bg-surface border border-line hover:bg-surface-muted active:bg-surface-muted",
  quiet: "hover:bg-surface-muted active:bg-surface-muted",
  danger:
    "border border-danger text-danger hover:bg-danger hover:text-white active:bg-danger active:text-white",
} as const;

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} />;
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-xl border border-line bg-surface px-3 min-h-12 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROL} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROL} ${className}`} />;
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/40 bg-danger/10 text-danger px-3 py-2.5 text-sm"
    >
      {message}
    </p>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-medium">{title}</p>
      {body ? <p className="text-sm text-muted mt-1">{body}</p> : null}
    </div>
  );
}

/**
 * A ring showing how far along one of the eight is.
 *
 * A ring rather than a bar because eight of them need to be scannable at a
 * glance on a phone, and a closed circle reads as "done" without needing to be
 * read at all.
 */
export function ProgressRing({
  fraction,
  met,
  size = 56,
  children,
}: {
  /** 0 to 1, or null when there is no target to measure against. */
  fraction: number | null;
  met: boolean;
  size?: number;
  children?: ReactNode;
}) {
  const stroke = size < 50 ? 5 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = fraction == null ? 0 : Math.max(0, Math.min(1, fraction));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={stroke}
        />
        {filled > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={met ? "var(--done)" : "var(--accent)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-medium">{children}</div>
    </div>
  );
}
