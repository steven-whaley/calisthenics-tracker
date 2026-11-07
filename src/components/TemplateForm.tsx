"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExerciseForm } from "@/components/ExerciseForm";
import { createExerciseInline } from "@/lib/actions";

export type PickableExercise = { id: string; name: string; detail: string };

export function TemplateForm({
  action,
  exercises,
  name,
  selectedIds = [],
  submitLabel,
  unit,
}: {
  action: (formData: FormData) => Promise<void>;
  exercises: PickableExercise[];
  name?: string;
  /** Initially selected exercises, in order. */
  selectedIds?: string[];
  submitLabel: string;
  unit: string;
}) {
  // Exercises created from this screen, available immediately without a reload.
  const [created, setCreated] = useState<PickableExercise[]>([]);
  const [creating, setCreating] = useState(false);
  const all = useMemo(() => [...exercises, ...created.filter((c) => !exercises.some((e) => e.id === c.id))], [exercises, created]);
  const byId = useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);
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
    return all
      .filter((e) => !picked.includes(e.id) && (q === "" || e.name.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [all, picked, query]);

  function add(id: string) {
    setPicked((p) => (p.includes(id) ? p : [...p, id]));
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  async function createExercise(fd: FormData): Promise<string | void> {
    const r = await createExerciseInline(fd);
    if (!r.ok) return r.error;
    setCreated((c) => [...c, r.exercise]);
    setPicked((p) => [...p, r.exercise.id]);
    setCreating(false);
    setQuery("");
  }

  useEffect(() => {
    if (!creating) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCreating(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating]);

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
    <>
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
            placeholder="Search your exercises…"
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
                  {all.length > 0 && picked.length === all.length ? "All exercises added" : "No matching exercises"}
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
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  setOpen(false);
                  setCreating(true);
                }}
                className="flex min-h-11 cursor-pointer items-center gap-2 border-t border-stone-300/50 px-3 py-2 text-base font-medium text-orange-700 dark:border-stone-700 dark:text-orange-400 sm:min-h-0 sm:text-sm"
              >
                + Create new exercise{query.trim() ? ` “${query.trim()}”` : ""}
              </li>
            </ul>
          )}
        </div>
        <button type="button" className="text-sm text-orange-700 underline dark:text-orange-400" onClick={() => setCreating(true)}>
          + Create a new exercise
        </button>
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

    {/* Rendered outside the template <form> so the forms are not nested. */}
    {creating && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create exercise"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
        onMouseDown={(e) => e.target === e.currentTarget && setCreating(false)}
      >
        <div className="card my-4 w-full max-w-xl space-y-3 bg-white shadow-xl dark:bg-stone-900">
          <h2 className="text-lg font-semibold">New exercise</h2>
          <ExerciseForm
            key={query}
            unit={unit}
            submitLabel="Create and add"
            onSubmitInline={createExercise}
            onCancel={() => setCreating(false)}
            initialName={query.trim()}
          />
        </div>
      </div>
    )}
    </>
  );
}
