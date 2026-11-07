"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MAIN = [
  { href: "/dashboard", label: "Today", icon: "🏋️" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/templates", label: "Templates", icon: "📋" },
  { href: "/coach", label: "Coach", icon: "💬" },
];
const MORE = [
  { href: "/exercises", label: "Exercises" },
  { href: "/progress", label: "Progress" },
  { href: "/issues", label: "Report an issue" },
  { href: "/settings", label: "Profile" },
];

/** Phone-only tab bar. The desktop header links are hidden below the md breakpoint. */
export function BottomNav({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = MORE.some((m) => active(m.href));
  const tab = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]";

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="safe-bottom absolute inset-x-0 bottom-14 border-t border-stone-300/70 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            {MORE.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setMoreOpen(false)}
                className={`flex min-h-12 items-center rounded-lg px-3 text-base ${active(m.href) ? "bg-orange-500/15 font-semibold" : ""}`}
              >
                {m.label}
              </Link>
            ))}
            <form action={signOutAction}>
              <button className="flex min-h-12 w-full items-center rounded-lg px-3 text-left text-base text-red-600">Sign out</button>
            </form>
          </div>
        </div>
      )}
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-300/70 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95 md:hidden"
      >
        {MAIN.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active(m.href) ? "page" : undefined}
            className={`${tab} ${active(m.href) ? "font-semibold text-orange-600" : "opacity-70"}`}
          >
            <span aria-hidden className="text-lg leading-none">{m.icon}</span>
            {m.label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
          className={`${tab} ${moreActive || moreOpen ? "font-semibold text-orange-600" : "opacity-70"}`}
        >
          <span aria-hidden className="text-lg leading-none">⋯</span>
          More
        </button>
      </nav>
    </>
  );
}
