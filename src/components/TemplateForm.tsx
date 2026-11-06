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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
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
                  className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm ${
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
        <p className="label">Order (drag to rearrange)</p>
        {picked.length === 0 && <p className="text-sm opacity-60">No exercises added yet.</p>}
        <ol className="space-y-2">
          {picked.map((id, i) => {
            const ex = byId.get(id)!;
            return (
              <li
                key={id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex != null) move(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={`flex items-center gap-3 rounded-lg border bg-white/60 px-3 py-2 dark:bg-stone-900/60 ${
                  overIndex === i && dragIndex !== i ? "border-orange-500" : "border-stone-300/70 dark:border-stone-700"
                } ${dragIndex === i ? "opacity-50" : ""}`}
              >
                <span className="cursor-grab select-none text-lg leading-none opacity-50" aria-hidden title="Drag to reorder">⠿</span>
                <span className="w-5 text-sm tabular-nums opacity-60">{i + 1}.</span>
                <span className="flex-1 text-sm font-medium">{ex.name}</span>
                {/* Keyboard / touch alternative to dragging */}
                <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${ex.name} up`}>↑</button>
                <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => move(i, i + 1)} disabled={i === picked.length - 1} aria-label={`Move ${ex.name} down`}>↓</button>
                <button type="button" className="btn-ghost !px-2 !py-1 text-red-600" onClick={() => setPicked((p) => p.filter((x) => x !== id))} aria-label={`Remove ${ex.name}`}>✕</button>
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
