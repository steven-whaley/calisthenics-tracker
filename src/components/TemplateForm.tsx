"use client";

import { useMemo, useRef, useState } from "react";

export type PickableExercise = { id: string; name: string; detail: string };

export function TemplateForm({
  action,
  exercises,
  name,
  selectedIds = [],
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  exercises: PickableExercise[];
  name?: string;
  /** Initially selected exercises, in order. */
  selectedIds?: string[];
  submitLabel: string;
}) {
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const [picked, setPicked] = useState<string[]>(() => selectedIds.filter((id) => byId.has(id)));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Touch-friendly drag: the dragged row follows the pointer (translateY); the order only changes on release.
  const [drag, setDrag] = useState<{ index: number; dy: number; over: number } | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => !picked.includes(e.id) && (q === "" || e.name.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [exercises, picked, query]);

  function add(id: string) {
    setPicked((p) => (p.includes(id) ? p : [...p, id]));
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function move(from: number, to: number) {
    setPicked((p) => {
      if (to < 0 || to >= p.length || from === to) return p;
      const next = [...p];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function startDrag(e: React.PointerEvent, index: number) {
    e.preventDefault();
    const startY = e.clientY;
    // Row positions are fixed while dragging, so measure once.
    const rects = itemRefs.current.map((el) => el?.getBoundingClientRect());
    const overAt = (y: number) => {
      let best = index;
      let bestDist = Infinity;
      rects.forEach((r, i) => {
        if (!r) return;
        const dist = Math.abs(y - (r.top + r.height / 2));
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    };
    setDrag({ index, dy: 0, over: index });
    const onMove = (ev: PointerEvent) => setDrag({ index, dy: ev.clientY - startY, over: overAt(ev.clientY) });
    const onEnd = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (ev.type === "pointerup") move(index, overAt(ev.clientY));
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      // Never submit the form from the search box.
      e.preventDefault();
      if (open && matches[active]) add(matches[active].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">Template name</label>
        <input id="name" name="name" required maxLength={60} defaultValue={name} className="input" placeholder="Push day" />
      </div>

      <div className="space-y-2">
        <label className="label" htmlFor="exercise-search">Add exercises</label>
        <div className="relative">
          <input
            ref={inputRef}
            id="exercise-search"
            type="text"
            role="combobox"
            aria-expanded={open && matches.length > 0}
            aria-controls="exercise-options"
            aria-autocomplete="list"
            autoComplete="off"
            className="input"
            enterKeyHint="done"
            placeholder={exercises.length === 0 ? "Create some exercises first" : "Search your exercises…"}
            disabled={exercises.length === 0}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
          {open && (
            <ul
              id="exercise-options"
              role="listbox"
              className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-400/60 bg-white shadow-lg dark:bg-stone-900"
            >
              {matches.length === 0 && (
                <li className="px-3 py-2 text-sm opacity-60">
                  {picked.length === exercises.length ? "All exercises added" : "No matching exercises"}
                </li>
              )}
              {matches.map((e, i) => (
                <li
                  key={e.id}
                  role="option"
                  aria-selected={i === active}
                  // mousedown (not click) so the input's blur doesn't close the list first
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    add(e.id);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-base sm:min-h-0 sm:text-sm ${
                    i === active ? "bg-orange-500/15" : ""
                  }`}
                >
                  <span>{e.name}</span>
                  <span className="text-xs opacity-60">{e.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="label">Order (drag the ⠿ handle, or use the arrows)</p>
        {picked.length === 0 && <p className="text-sm opacity-60">No exercises added yet.</p>}
        <ol className="space-y-2">
          {picked.map((id, i) => {
            const ex = byId.get(id)!;
            return (
              <li
                key={id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                style={drag?.index === i ? { transform: `translateY(${drag.dy}px)`, position: "relative", zIndex: 20 } : undefined}
                className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1 dark:bg-stone-900 sm:gap-3 sm:px-3 sm:py-2 ${
                  drag && drag.over === i && drag.index !== i ? "border-orange-500" : "border-stone-300/70 dark:border-stone-700"
                } ${drag?.index === i ? "shadow-lg ring-2 ring-orange-500/60" : ""}`}
              >
                {/* touch-none: stop the page scrolling while the handle is dragged */}
                <span
                  role="presentation"
                  onPointerDown={(e) => startDrag(e, i)}
                  className="flex h-11 w-9 cursor-grab touch-none select-none items-center justify-center text-xl leading-none opacity-60 active:cursor-grabbing sm:h-8 sm:w-6"
                  title="Drag to reorder"
                >
                  ⠿
                </span>
                <span className="w-5 text-sm tabular-nums opacity-60">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{ex.name}</span>
                <button type="button" className="btn-icon" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${ex.name} up`}>↑</button>
                <button type="button" className="btn-icon" onClick={() => move(i, i + 1)} disabled={i === picked.length - 1} aria-label={`Move ${ex.name} down`}>↓</button>
                <button type="button" className="btn-icon text-red-600" onClick={() => setPicked((p) => p.filter((x) => x !== id))} aria-label={`Remove ${ex.name}`}>✕</button>
                <input type="hidden" name={`inc_${id}`} value="on" />
                <input type="hidden" name={`ord_${id}`} value={i + 1} />
              </li>
            );
          })}
        </ol>
      </div>

      <button className="btn" disabled={picked.length === 0}>{submitLabel}</button>
    </form>
  );
}
