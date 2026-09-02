"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/log", label: "Log" },
  { href: "/settings", label: "Settings" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Three places, so they sit in the header on any screen rather than needing a
 * separate bottom bar. The person's name doubles as the Settings link.
 */
export function AppNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Primary">
      {ITEMS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${
              active ? "bg-accent-soft text-accent font-medium" : "text-muted hover:bg-surface-muted"
            }`}
          >
            {label === "Settings" ? (
              <>
                <span className="sm:hidden">You</span>
                <span className="hidden sm:inline">{name.split(" ")[0]}</span>
              </>
            ) : (
              label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
