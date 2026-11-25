"use client";

import { useEffect, useRef, useState } from "react";
import { PROGRESSION_LABELS, type ProgressionType } from "@/lib/531";
import { BODYWEIGHT_NOTE, PROGRESSION_INFO } from "@/lib/progressionInfo";

/**
 * An info button next to the "Progression type" label. Click or tap opens a panel that
 * explains each type offered in the form, with the currently selected one highlighted. Esc or an outside click closes it.
 */
export function ProgressionTip({ types, current, bodyweight = false }: { types: readonly ProgressionType[]; current?: ProgressionType; bodyweight?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="What do the progression types mean?"
        aria-expanded={open}
        aria-controls="progression-tip"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 text-xs font-bold leading-none opacity-80 hover:opacity-100"
      >
        i
      </button>
      {open && (
        <div
          id="progression-tip"
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 max-h-[60vh] w-[min(24rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-xl border border-stone-300 bg-white p-3 text-left text-xs font-normal shadow-lg dark:border-stone-600 dark:bg-stone-900"
        >
          {types.map((t) => {
            const info = PROGRESSION_INFO[t];
            if (!info) return null;
            return (
              <div key={t} className={t === current ? "rounded-lg bg-orange-500/10 p-2 ring-1 ring-orange-500/50" : "p-2"}>
                <p className="text-sm font-semibold">{PROGRESSION_LABELS[t]}{t === current ? " (selected)" : ""}</p>
                <p className="mt-1">{info.scheme}</p>
                <p className="mt-1"><span className="font-medium">Progresses: </span>{info.moves}</p>
                <p className="mt-1"><span className="font-medium">Choose when: </span>{info.choose}</p>
              </div>
            );
          })}
          {bodyweight && <p className="px-2 opacity-80">{BODYWEIGHT_NOTE}</p>}
        </div>
      )}
    </span>
  );
}
