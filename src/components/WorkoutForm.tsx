"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { CycleProgress } from "@/components/CycleProgress";
import type { TargetSet } from "@/lib/531";
import { fmt, fmtClock } from "@/lib/format";
import { clearWorkoutDraft, saveWorkoutDraft } from "@/lib/actions";
import { DRAFT_MAX_AGE_MS, draftKeyFor } from "@/lib/draftKey";

export type SessionExercise = {
  id: string;
  name: string;
  week: number;
  weekName: string;
  cycle: number;
  cyclesPerBlock: number;
  blockNumber: number;
  trainingMax: number;
  mains: TargetSet[];
  jokers: TargetSet[];
  jokersEnabled: boolean;
  hint?: string;
  /** Bodyweight-only ("just reps") exercise: no weights, targets or cycle. */
  repsOnly?: boolean;
  plannedSets?: number;
  goalReps?: number | null;
  nextProgression?: string | null;
};

/** Field values captured from the form, used to restore an in-progress workout. */
type Fields = Record<string, string>;

const DRAFT_PREFIX = "wf:";

function draftKey(exercises: SessionExercise[]) {
  return `${DRAFT_PREFIX}${draftKeyFor(exercises)}`;
}

function readDraft(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number };
    if (Date.now() - parsed.ts > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

// ---- Workout timer and rest timer -------------------------------------------------------------

const START_PREFIX = "wf:t:"; // cleared with the drafts after a save
const LOCAL_EVENT = "wf-local";
const REST_PRESETS = [30, 60, 90, 120, 180, 300];

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(LOCAL_EVENT));
}
const subscribeLocal = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(LOCAL_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(LOCAL_EVENT, cb);
  };
};

const subscribeSecond = (cb: () => void) => {
  const id = setInterval(cb, 500);
  return () => clearInterval(id);
};
/** Whole seconds since the epoch; 0 on the server so the first render matches. */
const useNowSeconds = () => useSyncExternalStore(subscribeSecond, () => Math.floor(Date.now() / 1000), () => 0);

let audioCtx: AudioContext | null = null;
/** Create/resume the audio context from a tap so the end-of-rest beep is allowed to play later. */
function primeAudio() {
  try {
    audioCtx ??= new AudioContext();
    void audioCtx.resume();
  } catch {}
}

/** "30 sec", "1 min", "1 min 30 sec" */
function fmtRest(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m === 0 ? `${sec} sec` : sec === 0 ? `${m} min` : `${m} min ${sec} sec`;
}

function beep() {
  try {
    navigator.vibrate?.([250, 120, 250]);
    const ctx = audioCtx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function WorkoutTimers({
  startedAt,
  onStart,
  rest,
  onRest,
}: {
  startedAt: number | null;
  onStart: () => void;
  rest: { endsAt: number; total: number } | null;
  onRest: (seconds: number | null) => void;
}) {
  const now = useNowSeconds();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const notified = useRef<number | null>(null);

  const elapsed = startedAt && now ? now - Math.floor(startedAt / 1000) : 0;
  const remaining = rest && now ? Math.ceil(rest.endsAt / 1000) - now : 0;
  const finished = !!rest && !!now && remaining <= 0;

  // Alert once when the rest period ends.
  useEffect(() => {
    if (rest && finished && notified.current !== rest.endsAt) {
      notified.current = rest.endsAt;
      beep();
    }
  }, [rest, finished]);

  function start(seconds: number) {
    primeAudio();
    onRest(seconds);
  }

  const pct = rest && !finished ? Math.min(100, Math.max(0, ((rest.total - remaining) / rest.total) * 100)) : 100;

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-stone-300/70 bg-white px-4 py-2 shadow-sm dark:border-stone-800 dark:bg-stone-950 sm:mx-0 sm:rounded-lg sm:border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-2" aria-label="Workout time">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Workout</span>
          <span className="font-mono text-lg tabular-nums">{fmtClock(elapsed)}</span>
          {!startedAt && (
            <button type="button" className="btn-ghost" onClick={onStart}>Start timer</button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2" aria-live="polite">
          {rest ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Rest</span>
              <span className={`font-mono text-lg tabular-nums ${finished ? "text-green-600" : ""}`}>
                {finished ? "Go!" : fmtClock(remaining)}
              </span>
              {!finished && (
                <button type="button" className="btn-ghost" onClick={() => start(Math.max(1, remaining + 30))}>+30s</button>
              )}
              <button type="button" className="btn-ghost" onClick={() => onRest(null)}>{finished ? "Dismiss" : "Skip"}</button>
            </>
          ) : (
            <button type="button" className="btn-ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? "Hide rest timer" : "Rest timer"}
            </button>
          )}
        </div>
      </div>
      {rest && !finished && (
        <div className="mt-1 h-1 overflow-hidden rounded bg-stone-300/60 dark:bg-stone-800">
          <div className="h-full bg-orange-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
      {open && !rest && (
        <div className="mt-2 space-y-2 border-t border-stone-300/50 pt-2 dark:border-stone-800">
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map((s) => (
              <button key={s} type="button" className="btn-ghost" onClick={() => start(s)}>{fmtClock(s)}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="rest-custom">Custom (seconds)</label>
            <input
              id="rest-custom"
              type="number"
              inputMode="numeric"
              min="5"
              max="3600"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="input !w-28"
            />
            <button
              type="button"
              className="btn"
              disabled={!(Number(custom) >= 5)}
              onClick={() => start(Math.min(3600, Math.trunc(Number(custom))))}
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One set: a "done" checkbox with the set label, the set's inputs, and (once the set is done) a rest picker.
 * Picking a rest duration starts the rest timer and records the duration with the set.
 */
function SetRow({
  name,
  label,
  cols,
  draft,
  onRest,
  onSetDone,
  children,
}: {
  name: string;
  label: string;
  cols: string;
  draft: Fields | null;
  onRest: (seconds: number) => void;
  onSetDone: () => void;
  children: React.ReactNode;
}) {
  const savedRest = Number(draft?.[`${name}_rest`]) || 0;
  const [done, setDone] = useState(draft?.[`${name}_done`] === "on");
  const [rest, setRest] = useState<number | null>(savedRest > 0 ? savedRest : null);
  const [custom, setCustom] = useState(savedRest > 0 && !REST_PRESETS.includes(savedRest) ? String(savedRest) : "");
  const [customOpen, setCustomOpen] = useState(savedRest > 0 && !REST_PRESETS.includes(savedRest));
  const selectValue = customOpen ? "custom" : rest ? String(rest) : "";

  function choose(seconds: number) {
    setRest(seconds);
    onRest(seconds);
  }

  return (
    <div className="space-y-1">
      <div className={`grid ${cols} items-center gap-2`}>
        <label className="flex min-h-11 items-center gap-1.5 text-sm sm:min-h-0">
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0"
            name={`${name}_done`}
            checked={done}
            onChange={(e) => {
              setDone(e.target.checked);
              if (e.target.checked) onSetDone();
            }}
            aria-label={`${label} done`}
          />
          {label}
        </label>
        {children}
      </div>
      {done && (
        <div className="flex flex-wrap items-center gap-2 pl-7 text-sm">
          <label htmlFor={`${name}_restsel`} className="opacity-70">Rest</label>
          <select
            id={`${name}_restsel`}
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") {
                setCustomOpen(true);
              } else {
                setCustomOpen(false);
                if (v) choose(Number(v));
                else setRest(null);
              }
            }}
            className="input !w-auto"
          >
            <option value="">Choose…</option>
            {REST_PRESETS.map((s) => (
              <option key={s} value={s}>{fmtRest(s)}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {customOpen && (
            <>
              <input
                type="number"
                inputMode="numeric"
                min="5"
                max="3600"
                placeholder="seconds"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="input !w-24"
                aria-label="Custom rest in seconds"
              />
              <button
                type="button"
                className="btn-ghost"
                disabled={!(Number(custom) >= 5)}
                onClick={() => choose(Math.min(3600, Math.trunc(Number(custom))))}
              >
                Start
              </button>
            </>
          )}
          {rest != null && <span className="text-xs opacity-60">Resting {fmtRest(rest)}</span>}
          <input type="hidden" name={`${name}_rest`} value={rest ?? ""} />
        </div>
      )}
    </div>
  );
}

function ExerciseBlock({
  ex,
  unit,
  draft,
  onRest,
  onSetDone,
}: {
  ex: SessionExercise;
  unit: string;
  draft: Fields | null;
  onRest: (seconds: number) => void;
  onSetDone: () => void;
}) {
  const p = `x_${ex.id}_`;
  const [include, setInclude] = useState(draft ? draft[`include_${ex.id}`] === "on" : true);
  const [jokerCount, setJokerCount] = useState(Math.min(Number(draft?.[`${p}jokerCount`] ?? 0) || 0, ex.jokers.length));
  const val = (name: string, fallback: string | number) => draft?.[name] ?? String(fallback);
  return (
    <div className="card space-y-3">
      <input type="hidden" name="exerciseId" value={ex.id} />
      <input type="hidden" name={`${p}week`} value={ex.week} />
      <input type="hidden" name={`${p}cycle`} value={ex.cycle} />
      <input type="hidden" name={`${p}jokerCount`} value={jokerCount} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h2 className="font-semibold">{ex.name}</h2>
          <p className="text-sm opacity-70 sm:text-xs">
            Week {ex.week} ({ex.weekName}) · TM {fmt(ex.trainingMax)} {unit}
          </p>
          {ex.hint && <p className="text-sm text-orange-600 dark:text-orange-400 sm:text-xs">{ex.hint}</p>}
          <CycleProgress cycle={ex.cycle} week={ex.week} cyclesPerBlock={ex.cyclesPerBlock} blockNumber={ex.blockNumber} />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5" name={`include_${ex.id}`} checked={include} onChange={(e) => setInclude(e.target.checked)} />
          Doing it
        </label>
      </div>

      {include && (
        <>
          <div className="grid grid-cols-[3.75rem_1fr_1fr_1fr] gap-2 text-xs font-semibold uppercase tracking-wide opacity-70">
            <span>Set</span><span>Target</span><span>{unit}</span><span>Reps</span>
          </div>
          {ex.mains.map((s, i) => (
            <SetRow key={i} name={`${p}main_${i}`} label={String(s.setNumber)} cols="grid-cols-[3.75rem_1fr_1fr_1fr]" draft={draft} onRest={onRest} onSetDone={onSetDone}>
              <span className="font-mono text-sm">{fmt(s.weight)}×{s.reps}{s.amrap ? "+" : ""}</span>
              <input name={`${p}main_${i}_weight`} type="number" inputMode="decimal" step="any" min="0" defaultValue={val(`${p}main_${i}_weight`, s.weight)} className="input !px-2" aria-label={`${ex.name} set ${s.setNumber} weight`} />
              <input name={`${p}main_${i}_reps`} type="number" inputMode="numeric" min="0" placeholder={String(s.reps)} defaultValue={val(`${p}main_${i}_reps`, "")} className="input !px-2" aria-label={`${ex.name} set ${s.setNumber} reps`} />
            </SetRow>
          ))}

          {ex.jokersEnabled && (
            <div className="space-y-2 border-t border-stone-300/50 pt-3 dark:border-stone-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Joker sets</h3>
                <div className="flex gap-2">
                  {jokerCount > 0 && (
                    <button type="button" className="btn-ghost" onClick={() => setJokerCount((c) => c - 1)}>Remove last</button>
                  )}
                  {jokerCount < ex.jokers.length && (
                    <button type="button" className="btn-ghost" onClick={() => setJokerCount((c) => c + 1)}>+ Add joker</button>
                  )}
                </div>
              </div>
              {ex.jokers.slice(0, jokerCount).map((s, j) => (
                <SetRow key={j} name={`${p}joker_${j}`} label={`J${s.setNumber}`} cols="grid-cols-[3.75rem_1fr_1fr_1fr]" draft={draft} onRest={onRest} onSetDone={onSetDone}>
                  <span className="font-mono text-sm">
                    {fmt(s.weight)}×{s.reps} <span className="opacity-50">({Math.round(s.pct * 100)}%)</span>
                  </span>
                  <input type="hidden" name={`${p}joker_${j}_target`} value={s.weight} />
                  <input type="hidden" name={`${p}joker_${j}_targetReps`} value={s.reps} />
                  <input name={`${p}joker_${j}_weight`} type="number" inputMode="decimal" step="any" min="0" defaultValue={val(`${p}joker_${j}_weight`, s.weight)} className="input !px-2" aria-label={`${ex.name} joker ${s.setNumber} weight`} />
                  <input name={`${p}joker_${j}_reps`} type="number" inputMode="numeric" min="0" placeholder={String(s.reps)} defaultValue={val(`${p}joker_${j}_reps`, "")} className="input !px-2" aria-label={`${ex.name} joker ${s.setNumber} reps`} />
                </SetRow>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RepsBlock({
  ex,
  draft,
  onRest,
  onSetDone,
}: {
  ex: SessionExercise;
  draft: Fields | null;
  onRest: (seconds: number) => void;
  onSetDone: () => void;
}) {
  const p = `x_${ex.id}_`;
  const [include, setInclude] = useState(draft ? draft[`include_${ex.id}`] === "on" : true);
  const [setsText, setSetsText] = useState(String(Math.min(Math.max(Number(draft?.[`${p}setCount`]) || ex.plannedSets || 3, 1), 20)));
  const [goalText, setGoalText] = useState(draft ? (draft[`${p}goalReps`] ?? "") : ex.goalReps ? String(ex.goalReps) : "");
  // Blank or out-of-range entries fall back to something sensible while typing.
  const sets = Math.min(Math.max(Math.trunc(Number(setsText)) || 1, 1), 20);
  const setSets = (f: (n: number) => number) => setSetsText(String(Math.min(Math.max(f(sets), 1), 20)));
  const goal = Math.trunc(Number(goalText)) || 0;
  return (
    <div className="card space-y-3">
      <input type="hidden" name="exerciseId" value={ex.id} />
      <input type="hidden" name={`${p}week`} value={ex.week} />
      <input type="hidden" name={`${p}cycle`} value={ex.cycle} />
      <input type="hidden" name={`${p}setCount`} value={sets} />
      <input type="hidden" name={`${p}goalReps`} value={goalText} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h2 className="font-semibold">{ex.name}</h2>
          <p className="text-sm opacity-70 sm:text-xs">
            Bodyweight
            {ex.nextProgression ? ` · next: ${ex.nextProgression}` : ""}
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5" name={`include_${ex.id}`} checked={include} onChange={(e) => setInclude(e.target.checked)} />
          Doing it
        </label>
      </div>
      {include && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor={`${p}sets`}>Target sets</label>
              <input
                id={`${p}sets`}
                type="number"
                inputMode="numeric"
                min="1"
                max="20"
                value={setsText}
                onChange={(e) => setSetsText(e.target.value)}
                onBlur={() => setSetsText(String(sets))}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor={`${p}goal`}>Target reps per set</label>
              <input
                id={`${p}goal`}
                type="number"
                inputMode="numeric"
                min="1"
                max="30"
                placeholder="Optional"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <p className="text-xs opacity-70">Changes to the targets are saved to this exercise when you complete the workout.</p>
          {Array.from({ length: sets }, (_, i) => (
            <SetRow key={i} name={`${p}main_${i}`} label={String(i + 1)} cols="grid-cols-[3.75rem_1fr]" draft={draft} onRest={onRest} onSetDone={onSetDone}>
              <input
                name={`${p}main_${i}_reps`}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder={goal ? String(goal) : "Reps"}
                defaultValue={draft?.[`${p}main_${i}_reps`] ?? ""}
                className="input"
                aria-label={`${ex.name} set ${i + 1} reps`}
              />
            </SetRow>
          ))}
          <div className="flex gap-2">
            {sets < 20 && <button type="button" className="btn-ghost" onClick={() => setSets((n) => n + 1)}>+ Add set</button>}
            {sets > 1 && <button type="button" className="btn-ghost" onClick={() => setSets((n) => n - 1)}>Remove last</button>}
          </div>
        </>
      )}
    </div>
  );
}

export function WorkoutForm({
  action,
  exercises,
  unit,
  initialDraft = null,
}: {
  action: (formData: FormData) => Promise<void>;
  exercises: SessionExercise[];
  unit: string;
  /** The workout in progress saved on the server, restored automatically. */
  initialDraft?: { fields: Fields; updatedAt: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const raf = useRef<number | null>(null);
  const focusValue = useRef("");
  const router = useRouter();
  // Set once the workout is discarded so a late autosave can't recreate the draft.
  const discarded = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);

  const key = draftKey(exercises);
  const savedRaw = useSyncExternalStore(subscribeStorage, () => readDraft(key), () => null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  // Restored draft values; `formKey` remounts the fields so they pick them up.
  const [draft, setDraft] = useState<Fields | null>(initialDraft?.fields ?? null);
  const [formKey, setFormKey] = useState(0);
  // Once the user restores, discards or starts typing, stop offering the old draft.
  const [handled, setHandled] = useState(!!initialDraft);
  const [showRestored, setShowRestored] = useState(!!initialDraft);
  // Server autosave: pushed as soon as a set is logged, and shortly after any other edit.
  const serverKey = draftKeyFor(exercises);
  const [sync, setSync] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const syncTimer = useRef<number | null>(null);
  const pushRef = useRef<() => void>(() => {});
  const finished = useRef(false); // set while submitting so a late autosave can't recreate the draft

  // Default the date to the user's local date (the server only knows UTC).
  useEffect(() => {
    const d = new Date();
    if (dateRef.current && !dateRef.current.value) {
      dateRef.current.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }, []);

  function collectFields(): Fields {
    const fields: Fields = {};
    if (formRef.current) for (const [k, v] of new FormData(formRef.current).entries()) if (typeof v === "string") fields[k] = v;
    // Keep the workout timer with the draft so it survives a device switch.
    const started = readLocal(`${START_PREFIX}${key.slice(DRAFT_PREFIX.length)}`);
    if (started) fields.__startedAt = started;
    return fields;
  }

  function pushDraft() {
    if (!formRef.current || discarded.current || finished.current) return;
    setSync("saving");
    saveWorkoutDraft(serverKey, collectFields()).then(
      () => setSync("saved"),
      () => setSync("offline"), // still saved on this device
    );
  }
  function queuePush(delay: number) {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null;
      pushDraft();
    }, delay);
  }
  // Latest pushDraft for the unmount flush below.
  useEffect(() => {
    pushRef.current = pushDraft;
  });
  // Leaving the page with an edit still waiting to be sent: send it now.
  useEffect(
    () => () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
        pushRef.current();
      }
    },
    [],
  );
  // A workout timer restored from the server draft.
  useEffect(() => {
    const started = initialDraft?.fields.__startedAt;
    const k = `${START_PREFIX}${key.slice(DRAFT_PREFIX.length)}`;
    if (started && !readLocal(k)) writeLocal(k, started);
  }, [initialDraft, key]);

  function saveDraft() {
    if (!formRef.current || discarded.current || finished.current) return;
    const fields = collectFields();
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), fields }));
    } catch {
      /* storage unavailable (private mode / full): the draft just isn't saved */
    }
  }

  // Runs after React has committed the state change that triggered the event.
  function scheduleSave() {
    setHandled(true);
    setShowRestored(false);
    queuePush(1500);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(saveDraft);
  }

  function discardDraft() {
    try {
      localStorage.removeItem(key);
    } catch {}
    setHandled(true);
  }

  function restoreDraft() {
    if (!savedRaw) return;
    try {
      const parsed = JSON.parse(savedRaw) as { fields: Fields };
      setDraft(parsed.fields);
      setFormKey((k) => k + 1);
    } catch {}
    setHandled(true);
  }

  const showBanner = !!savedRaw && !handled;

  /** Throw away everything from this workout: the saved draft, the workout timer and the rest timer. Nothing was ever sent to the server. */
  async function discardWorkout() {
    discarded.current = true;
    if (raf.current) cancelAnimationFrame(raf.current);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    try {
      await clearWorkoutDraft(serverKey);
    } catch {
      /* offline: the server draft expires on its own; the device draft is cleared below */
    }
    writeLocal(key, null);
    writeLocal(`${START_PREFIX}${key.slice(DRAFT_PREFIX.length)}`, null);
    setRest(null);
    router.push("/dashboard");
  }

  // Workout timer: persisted so a refresh or app switch doesn't lose it.
  const startKey = `${START_PREFIX}${key.slice(DRAFT_PREFIX.length)}`;
  const startRaw = useSyncExternalStore(
    subscribeLocal,
    () => {
      const raw = readLocal(startKey);
      return raw && Date.now() - Number(raw) < DRAFT_MAX_AGE_MS ? raw : null;
    },
    () => null,
  );
  const startedAt = startRaw ? Number(startRaw) : null;

  function startWorkout() {
    if (!startedAt) writeLocal(startKey, String(Date.now()));
  }
  function setRestTimer(seconds: number | null) {
    if (seconds) primeAudio();
    setRest(seconds ? { endsAt: Date.now() + seconds * 1000, total: seconds } : null);
  }
  /** A set was ticked as done: start the workout timer and save the draft right away. */
  function setDone() {
    startWorkout();
    queuePush(0);
  }

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onInput={scheduleSave}
      onChange={scheduleSave}
      onFocusCapture={(e) => {
        if (e.target instanceof HTMLInputElement) focusValue.current = e.target.value;
      }}
      onBlurCapture={(e) => {
        // Logging reps for a set starts the workout timer, and the rest timer if auto-rest is on.
        const t = e.target;
        if (t instanceof HTMLInputElement && /_(main|joker)_\d+_reps$/.test(t.name) && t.value !== "" && t.value !== focusValue.current) {
          startWorkout();
          queuePush(0); // a set was completed: save it now
        }
      }}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button")) scheduleSave();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (startedAt) fd.set("durationSeconds", String(Math.round((Date.now() - startedAt) / 1000)));
        fd.set("draftKey", serverKey);
        finished.current = true;
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = null;
        setError(null);
        startTransition(async () => {
          try {
            await action(fd);
          } catch (err) {
            unstable_rethrow(err); // let Next handle the redirect after a successful save
            finished.current = false;
            setError("Couldn't save. Your entries are still on this screen and saved on this device. Check your connection and try again.");
          }
        });
      }}
    >
      {!online && (
        <p role="status" className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm">
          You&apos;re offline. Keep logging: your entries are saved on this device. Tap Complete workout once you&apos;re back online.
        </p>
      )}
      {showBanner && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/60 bg-orange-500/10 px-3 py-2 text-sm">
          <span>You have an unfinished workout saved on this device.</span>
          <span className="flex gap-2">
            <button type="button" className="btn" onClick={restoreDraft}>Restore</button>
            <button type="button" className="btn-ghost" onClick={discardDraft}>Discard</button>
          </span>
        </div>
      )}
      {showRestored && (
        <p role="status" className="rounded-lg border border-green-600/50 bg-green-600/10 px-3 py-2 text-sm">
          Restored your in-progress workout.
        </p>
      )}
      <WorkoutTimers startedAt={startedAt} onStart={startWorkout} rest={rest} onRest={setRestTimer} />
      {sync !== "idle" && (
        <p className="text-xs opacity-60" aria-live="polite">
          {sync === "saving" ? "Saving progress…" : sync === "saved" ? "Progress saved" : "Offline: progress saved on this device only"}
        </p>
      )}
      <div key={formKey} className="space-y-4">
        <div className="max-w-xs">
          <label className="label" htmlFor="date">Date</label>
          <input id="date" name="date" type="date" required ref={dateRef} defaultValue={draft?.date ?? ""} className="input" />
        </div>
        {exercises.map((ex) =>
          ex.repsOnly ? (
            <RepsBlock key={ex.id} ex={ex} draft={draft} onRest={setRestTimer} onSetDone={setDone} />
          ) : (
            <ExerciseBlock key={ex.id} ex={ex} unit={unit} draft={draft} onRest={setRestTimer} onSetDone={setDone} />
          ),
        )}
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={2} maxLength={500} defaultValue={draft?.notes ?? ""} className="input" />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Saving…" : "Complete workout"}</button>
        {confirmDiscard ? (
          <span className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm discard">
            <span className="text-sm">Discard this workout? Nothing will be saved.</span>
            <button type="button" className="btn !bg-red-600 hover:!bg-red-500" onClick={discardWorkout} disabled={pending}>Yes, discard</button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmDiscard(false)}>Keep going</button>
          </span>
        ) : (
          <button type="button" className="btn-ghost text-red-600" onClick={() => setConfirmDiscard(true)} disabled={pending}>
            Discard workout
          </button>
        )}
      </div>
    </form>
  );
}
