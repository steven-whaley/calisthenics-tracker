"use client";

import { useRef, useState, useTransition } from "react";
import { ProgressionFields } from "@/components/ProgressionFields";
import type { Exercise } from "@/db/schema";
import { suggestNextForName } from "@/lib/actions";
import type { ExerciseCategory, ProgressionType } from "@/lib/531";

export function ExerciseForm({
  action,
  onSubmitInline,
  onCancel,
  initialName,
  exercise,
  unit,
  submitLabel,
}: {
  /** Standard mode: a server action that saves and redirects. */
  action?: (formData: FormData) => Promise<void>;
  /** Inline mode: save without leaving the page; return an error message, or nothing on success. */
  onSubmitInline?: (formData: FormData) => Promise<string | void>;
  onCancel?: () => void;
  initialName?: string;
  exercise?: Exercise;
  unit: string;
  submitLabel: string;
}) {
  const inline = !!onSubmitInline;
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const isNew = !exercise;
  const [category, setCategory] = useState<ExerciseCategory>((exercise?.category as ExerciseCategory) ?? "upper");
  const bodyweight = category === "bodyweight";

  // Bodyweight only: the coach suggests the next harder variation.
  const nameRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [coachNote, setCoachNote] = useState<string | null>(null);

  function suggest() {
    const name = nameRef.current?.value.trim() ?? "";
    if (name.length < 2) {
      setCoachNote("Enter the exercise name first.");
      return;
    }
    setCoachNote(null);
    startTransition(async () => {
      const r = await suggestNextForName(name);
      if (r.suggestion && nextRef.current) {
        nextRef.current.value = r.suggestion;
        setCoachNote("Suggested by the coach. Edit it if you prefer something else.");
      } else {
        setCoachNote(r.error ?? "No suggestion. This may already be the hardest variation; you can type one yourself.");
      }
    });
  }

  return (
    <form
      action={inline ? undefined : action}
      onSubmit={
        inline
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              const fd = new FormData(e.currentTarget);
              setSaveError(null);
              startSaving(async () => {
                const err = await onSubmitInline!(fd);
                if (err) setSaveError(err);
              });
            }
          : undefined
      }
      className={inline ? "grid gap-4 sm:grid-cols-2" : "card grid gap-4 sm:grid-cols-2"}
    >
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Exercise name</label>
        <input
          ref={nameRef}
          id="name"
          name="name"
          required
          maxLength={60}
          defaultValue={exercise?.name ?? initialName}
          className="input"
          placeholder={bodyweight ? "Pike HSPU" : "Weighted pull-up"}
          onBlur={() => {
            // Offer a suggestion automatically when creating a bodyweight exercise.
            if (isNew && bodyweight && !nextRef.current?.value && !pending) suggest();
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor="category">Type</label>
        {exercise?.progression === "reps" ? (
          <>
            <input type="hidden" name="category" value="bodyweight" />
            <p className="input opacity-80">Bodyweight only</p>
          </>
        ) : (
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
            className="input"
          >
            <option value="upper">Upper body (+{unit === "kg" ? "2.5" : "5"} per cycle suggested)</option>
            <option value="lower">Lower body (+{unit === "kg" ? "5" : "10"} per cycle suggested)</option>
            <option value="other">Other</option>
            {isNew && <option value="bodyweight">Bodyweight only (no weights)</option>}
          </select>
        )}
      </div>

      {bodyweight ? (
        <>
          <div>
            <label className="label" htmlFor="setCount">Sets</label>
            <input id="setCount" name="setCount" type="number" min="1" max="10" defaultValue={exercise?.setCount ?? 3} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="repTarget">Goal reps per set (optional)</label>
            <input id="repTarget" name="repTarget" type="number" min="1" max="30" defaultValue={exercise?.repTarget ?? ""} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="nextProgression">Next progression</label>
            <div className="flex gap-2">
              <input
                ref={nextRef}
                id="nextProgression"
                name="nextProgression"
                maxLength={60}
                defaultValue={exercise?.nextProgression ?? ""}
                className="input"
                placeholder="e.g. Elevated pike HSPU"
              />
              <button type="button" className="btn-ghost whitespace-nowrap" onClick={suggest} disabled={pending}>
                {pending ? "Asking…" : "Ask coach"}
              </button>
            </div>
            {coachNote && <p className="mt-1 text-xs opacity-70">{coachNote}</p>}
            <p className="mt-1 text-xs opacity-70">
              There is no set schedule for bodyweight exercises. You decide when you are ready to move on to the next progression.
            </p>
          </div>
        </>
      ) : (
        <>
          {isNew ? (
            <>
              <div>
                <label className="label" htmlFor="trainingMax">Training max ({unit})</label>
                <input id="trainingMax" name="trainingMax" type="number" step="any" min="1" className="input" placeholder="e.g. 135" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="oneRepMax">…or 1RM ({unit})</label>
                  <input id="oneRepMax" name="oneRepMax" type="number" step="any" min="1" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="tmPercent">TM %</label>
                  <input id="tmPercent" name="tmPercent" type="number" min="50" max="100" defaultValue={90} className="input" />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="trainingMax">Current training max ({unit})</label>
              <input id="trainingMax" name="trainingMax" type="number" step="any" min="1" required defaultValue={exercise.trainingMax} className="input" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="cyclesPerBlock">3-week cycles before deload</label>
            <input id="cyclesPerBlock" name="cyclesPerBlock" type="number" min="1" max="12" required defaultValue={exercise?.cyclesPerBlock ?? 2} className="input" />
          </div>
          <ProgressionFields
            progression={exercise?.progression as ProgressionType | undefined}
            setCount={exercise?.setCount}
            repTarget={exercise?.repTarget}
            jokersEnabled={exercise?.jokersEnabled}
            unit={unit}
            increment={exercise?.increment ?? (unit === "kg" ? 2.5 : 5)}
          />
        </>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button className="btn" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>}
        {saveError && <p role="alert" className="w-full text-sm text-red-600">{saveError}</p>}
      </div>
    </form>
  );
}
