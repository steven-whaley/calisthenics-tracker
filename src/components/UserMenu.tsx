"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** The signed-in user in the header: click for a menu with Profile and Sign out. */
export function UserMenu({ name, image, signOutAction }: { name?: string | null; image?: string | null; signOutAction: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-stone-500/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />}
        <span className="hidden opacity-80 sm:inline">{name ?? "Account"}</span>
        <span aria-hidden className="text-xs opacity-60">&#9662;</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-stone-300 bg-white p-1 text-sm shadow-lg dark:border-stone-600 dark:bg-stone-900">
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 hover:bg-stone-500/10">
            Profile
          </Link>
          <form action={signOutAction}>
            <button role="menuitem" className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-red-600 hover:bg-stone-500/10">Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
