"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { CycleProgress } from "@/components/CycleProgress";
import type { TargetSet } from "@/lib/531";
import { fmt, fmtClock } from "@/lib/format";

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
const DRAFT_MAX_AGE_MS = 36 * 60 * 60 * 1000;

function draftKey(exercises: SessionExercise[]) {
  return `${DRAFT_PREFIX}${exercises.map((e) => `${e.id}:${e.cycle}:${e.week}`).join(",")}`;
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
const PREF_PREFIX = "wfpref:"; // rest timer preferences, kept across workouts
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
const useLocal = (key: string) => useSyncExternalStore(subscribeLocal, () => readLocal(key), () => null);

const subscribeSecond = (cb: () => void) => {
  const id = setInterval(cb, 500);
  return () => clearInterval(id);
};
/** Whole seconds since the epoch; 0 on the server so the first render matches. */
const useNowSeconds = () => useSyncExternalStore(subscribeSecond, () => Math.floor(Date.now() / 1000), () => 0);

function beep(ctx: AudioContext | null) {
  try {
    navigator.vibrate?.([250, 120, 250]);
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
  const autoRest = useLocal(`${PREF_PREFIX}auto`) === "1";
  const autoSeconds = Number(useLocal(`${PREF_PREFIX}secs`)) || 90;
  const notified = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const elapsed = startedAt && now ? now - Math.floor(startedAt / 1000) : 0;
  const remaining = rest && now ? Math.ceil(rest.endsAt / 1000) - now : 0;
  const finished = !!rest && !!now && remaining <= 0;

  // Alert once when the rest period ends.
  useEffect(() => {
    if (rest && finished && notified.current !== rest.endsAt) {
      notified.current = rest.endsAt;
      beep(ctxRef.current);
    }
  }, [rest, finished]);

  function start(seconds: number, remember = true) {
    // Created on a tap so the end-of-rest beep is allowed to play later.
    try {
      ctxRef.current ??= new AudioContext();
      void ctxRef.current.resume();
    } catch {}
    if (remember) writeLocal(`${PREF_PREFIX}secs`, String(seconds));
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
                <button type="button" className="btn-ghost" onClick={() => start(Math.max(1, remaining + 30), false)}>+30s</button>
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
          <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={autoRest}
              onChange={(e) => writeLocal(`${PREF_PREFIX}auto`, e.target.checked ? "1" : "0")}
            />
            Start a {fmtClock(autoSeconds)} rest automatically after I log a set
          </label>
        </div>
      )}
    </div>
  );
}

function ExerciseBlock({ ex, unit, draft }: { ex: SessionExercise; unit: string; draft: Fields | null }) {
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
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-xs font-semibold uppercase tracking-wide opacity-70">
            <span>Set</span><span>Target</span><span>{unit}</span><span>Reps</span>
          </div>
          {ex.mains.map((s, i) => (
            <div key={i} className="grid grid-cols-[2rem_1fr_1fr_1fr] items-center gap-2">
              <span className="text-sm">{s.setNumber}</span>
              <span className="font-mono text-sm">{fmt(s.weight)}×{s.reps}{s.amrap ? "+" : ""}</span>
              <input name={`${p}main_${i}_weight`} type="number" inputMode="decimal" step="any" min="0" defaultValue={val(`${p}main_${i}_weight`, s.weight)} className="input !px-2" aria-label={`${ex.name} set ${s.setNumber} weight`} />
              <input name={`${p}main_${i}_reps`} type="number" inputMode="numeric" min="0" placeholder={String(s.reps)} defaultValue={val(`${p}main_${i}_reps`, "")} className="input !px-2" aria-label={`${ex.name} set ${s.setNumber} reps`} />
            </div>
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
                <div key={j} className="grid grid-cols-[2rem_1fr_1fr_1fr] items-center gap-2">
                  <span className="text-sm">J{s.setNumber}</span>
                  <span className="font-mono text-sm">
                    {fmt(s.weight)}×{s.reps} <span className="opacity-50">({Math.round(s.pct * 100)}%)</span>
                  </span>
                  <input type="hidden" name={`${p}joker_${j}_target`} value={s.weight} />
                  <input type="hidden" name={`${p}joker_${j}_targetReps`} value={s.reps} />
                  <input name={`${p}joker_${j}_weight`} type="number" inputMode="decimal" step="any" min="0" defaultValue={val(`${p}joker_${j}_weight`, s.weight)} className="input !px-2" aria-label={`${ex.name} joker ${s.setNumber} weight`} />
                  <input name={`${p}joker_${j}_reps`} type="number" inputMode="numeric" min="0" placeholder={String(s.reps)} defaultValue={val(`${p}joker_${j}_reps`, "")} className="input !px-2" aria-label={`${ex.name} joker ${s.setNumber} reps`} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RepsBlock({ ex, draft }: { ex: SessionExercise; draft: Fields | null }) {
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
            <div key={i} className="grid grid-cols-[2rem_1fr] items-center gap-2">
              <span className="text-sm">{i + 1}</span>
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
            </div>
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
}: {
  action: (formData: FormData) => Promise<void>;
  exercises: SessionExercise[];
  unit: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const raf = useRef<number | null>(null);
  const focusValue = useRef("");
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);

  const key = draftKey(exercises);
  const savedRaw = useSyncExternalStore(subscribeStorage, () => readDraft(key), () => null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  // Restored draft values; `formKey` remounts the fields so they pick them up.
  const [draft, setDraft] = useState<Fields | null>(null);
  const [formKey, setFormKey] = useState(0);
  // Once the user restores, discards or starts typing, stop offering the old draft.
  const [handled, setHandled] = useState(false);

  // Default the date to the user's local date (the server only knows UTC).
  useEffect(() => {
    const d = new Date();
    if (dateRef.current && !dateRef.current.value) {
      dateRef.current.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }, []);

  function saveDraft() {
    if (!formRef.current) return;
    const fields: Fields = {};
    for (const [k, v] of new FormData(formRef.current).entries()) if (typeof v === "string") fields[k] = v;
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), fields }));
    } catch {
      /* storage unavailable (private mode / full): the draft just isn't saved */
    }
  }

  // Runs after React has committed the state change that triggered the event.
  function scheduleSave() {
    setHandled(true);
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
  const autoRest = useLocal(`${PREF_PREFIX}auto`) === "1";
  const autoSeconds = Number(useLocal(`${PREF_PREFIX}secs`)) || 90;

  function startWorkout() {
    if (!startedAt) writeLocal(startKey, String(Date.now()));
  }
  function setRestTimer(seconds: number | null) {
    setRest(seconds ? { endsAt: Date.now() + seconds * 1000, total: seconds } : null);
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
          if (autoRest) setRestTimer(autoSeconds);
        }
      }}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button")) scheduleSave();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (startedAt) fd.set("durationSeconds", String(Math.round((Date.now() - startedAt) / 1000)));
        setError(null);
        startTransition(async () => {
          try {
            await action(fd);
          } catch (err) {
            unstable_rethrow(err); // let Next handle the redirect after a successful save
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
      <WorkoutTimers startedAt={startedAt} onStart={startWorkout} rest={rest} onRest={setRestTimer} />
      <div key={formKey} className="space-y-4">
        <div className="max-w-xs">
          <label className="label" htmlFor="date">Date</label>
          <input id="date" name="date" type="date" required ref={dateRef} defaultValue={draft?.date ?? ""} className="input" />
        </div>
        {exercises.map((ex) =>
          ex.repsOnly ? <RepsBlock key={ex.id} ex={ex} draft={draft} /> : <ExerciseBlock key={ex.id} ex={ex} unit={unit} draft={draft} />,
        )}
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={2} maxLength={500} defaultValue={draft?.notes ?? ""} className="input" />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Saving…" : "Complete workout"}</button>
    </form>
  );
}
