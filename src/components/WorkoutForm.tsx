"use client";

import { useEffect, useRef, useState } from "react";
import { CycleProgress } from "@/components/CycleProgress";
import type { TargetSet } from "@/lib/531";
import { fmt } from "@/lib/format";

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
};

function ExerciseBlock({ ex, unit }: { ex: SessionExercise; unit: string }) {
  const [include, setInclude] = useState(true);
  const [jokerCount, setJokerCount] = useState(0);
  const p = `x_${ex.id}_`;
  return (
    <div className="card space-y-3">
      <input type="hidden" name="exerciseId" value={ex.id} />
      <input type="hidden" name={`${p}week`} value={ex.week} />
      <input type="hidden" name={`${p}cycle`} value={ex.cycle} />
      <input type="hidden" name={`${p}jokerCount`} value={jokerCount} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h2 className="font-semibold">{ex.name}</h2>
          <p className="text-xs opacity-70">
            Week {ex.week} ({ex.weekName}) · TM {fmt(ex.trainingMax)} {unit}
          </p>
          {ex.hint && <p className="text-xs text-orange-600 dark:text-orange-400">{ex.hint}</p>}
          <CycleProgress cycle={ex.cycle} week={ex.week} cyclesPerBlock={ex.cyclesPerBlock} blockNumber={ex.blockNumber} />
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name={`include_${ex.id}`} checked={include} onChange={(e) => setInclude(e.target.checked)} />
          Doing it
        </label>
      </div>

      {include && (
        <>
          <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 text-xs font-semibold uppercase tracking-wide opacity-70">
            <span>Set</span><span>Target</span><span>Weight ({unit})</span><span>Reps done</span>
          </div>
          {ex.mains.map((s, i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-2">
              <span className="text-sm">{s.setNumber}</span>
              <span className="font-mono text-sm">{fmt(s.weight)}×{s.reps}{s.amrap ? "+" : ""}</span>
              <input name={`${p}main_${i}_weight`} type="number" step="any" min="0" defaultValue={s.weight} className="input" aria-label={`${ex.name} set ${s.setNumber} weight`} />
              <input name={`${p}main_${i}_reps`} type="number" min="0" placeholder={String(s.reps)} className="input" aria-label={`${ex.name} set ${s.setNumber} reps`} />
            </div>
          ))}

          {ex.jokersEnabled && (
            <div className="space-y-2 border-t border-stone-300/50 pt-3 dark:border-stone-700">
              <div className="flex items-center justify-between">
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
                <div key={j} className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-2">
                  <span className="text-sm">J{s.setNumber}</span>
                  <span className="font-mono text-sm">
                    {fmt(s.weight)}×{s.reps} <span className="opacity-50">({Math.round(s.pct * 100)}%)</span>
                  </span>
                  <input type="hidden" name={`${p}joker_${j}_target`} value={s.weight} />
                  <input type="hidden" name={`${p}joker_${j}_targetReps`} value={s.reps} />
                  <input name={`${p}joker_${j}_weight`} type="number" step="any" min="0" defaultValue={s.weight} className="input" aria-label={`${ex.name} joker ${s.setNumber} weight`} />
                  <input name={`${p}joker_${j}_reps`} type="number" min="0" placeholder={String(s.reps)} className="input" aria-label={`${ex.name} joker ${s.setNumber} reps`} />
                </div>
              ))}
            </div>
          )}
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
  const [pending, setPending] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  // Default to the user's local date (the server only knows UTC).
  useEffect(() => {
    const d = new Date();
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
        } finally {
          setPending(false);
        }
      }}
      className="space-y-4"
    >
      <div className="max-w-xs">
        <label className="label" htmlFor="date">Date</label>
        <input id="date" name="date" type="date" required ref={dateRef} className="input" />
      </div>
      {exercises.map((ex) => (
        <ExerciseBlock key={ex.id} ex={ex} unit={unit} />
      ))}
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} maxLength={500} className="input" />
      </div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Complete workout"}</button>
    </form>
  );
}
