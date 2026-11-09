"use client";

import { useRef, useState, useTransition } from "react";
import { ProgressionFields } from "@/components/ProgressionFields";
import type { Exercise } from "@/db/schema";
import { suggestNextForName } from "@/lib/actions";
import {
  BODYWEIGHT_PROGRESSION_TYPES,
  DEFAULT_DURATION_SECONDS,
  DEFAULT_DURATION_SETS,
  PROGRESSION_HELP,
  PROGRESSION_LABELS,
  type ExerciseCategory,
  type ProgressionType,
} from "@/lib/531";

type BodyweightType = (typeof BODYWEIGHT_PROGRESSION_TYPES)[number] | "reps";

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
  const [progression, setProgression] = useState<ProgressionType>(
    exercise && exercise.progression !== "reps" ? (exercise.progression as ProgressionType) : "531",
  );
  // Editing an exercise into a different progression type resets its cycle position.
  // Bodyweight exercises are weightless straight sets or timed sets ("reps" is only for legacy exercises).
  const [bwType, setBwType] = useState<BodyweightType>(
    exercise?.category === "bodyweight" && ["straight_sets", "duration", "reps"].includes(exercise.progression)
      ? (exercise.progression as BodyweightType)
      : "straight_sets",
  );
  const legacyReps = bodyweight && bwType === "reps";
  const typeChanged =
    !!exercise &&
    (bodyweight
      ? exercise.category !== "bodyweight" || exercise.progression !== bwType
      : progression !== exercise.progression || exercise.category === "bodyweight");

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
            if (legacyReps && !nextRef.current?.value && !pending) suggest();
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor="category">Type</label>
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
          <option value="bodyweight">Bodyweight only (no weights)</option>
        </select>
      </div>

      {bodyweight ? (
        <>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="progression">Progression type</label>
            <select id="progression" name="progression" value={bwType} onChange={(e) => setBwType(e.target.value as BodyweightType)} className="input">
              {BODYWEIGHT_PROGRESSION_TYPES.map((t) => (
                <option key={t} value={t}>{t === "straight_sets" ? "Straight sets (reps)" : "Timed sets (seconds)"}</option>
              ))}
              {exercise?.progression === "reps" && <option value="reps">{PROGRESSION_LABELS.reps} (legacy)</option>}
            </select>
            <p className="mt-1 text-xs opacity-70">
              {bwType === "straight_sets"
                ? "Sets × reps with no weight. Hit the target reps on at least half your sets to move up next week."
                : bwType === "duration"
                  ? "Hold or work for a target time each set. Hit the target time on at least half your sets to move up next week."
                  : PROGRESSION_HELP.reps}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="setCount">Sets</label>
            <input id="setCount" name="setCount" type="number" min="1" max="10" defaultValue={exercise?.setCount ?? (bwType === "duration" ? DEFAULT_DURATION_SETS : 3)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="repTarget">
              {bwType === "duration" ? "Seconds per set" : legacyReps ? "Goal reps per set (optional)" : "Reps per set"}
            </label>
            <input
              key={bwType}
              id="repTarget"
              name="repTarget"
              type="number"
              min="1"
              max={bwType === "duration" ? "3600" : "30"}
              required={!legacyReps}
              defaultValue={exercise?.repTarget ?? (legacyReps ? "" : bwType === "duration" ? DEFAULT_DURATION_SECONDS : 8)}
              className="input"
            />
          </div>
          {legacyReps ? (
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
                There is no set schedule for this legacy type. You decide when you are ready to move on to the next progression.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="durationIncrement">
                  {bwType === "duration" ? "Seconds added per successful week (optional)" : "Reps added per successful week (optional)"}
                </label>
                <input
                  key={bwType}
                  id="durationIncrement"
                  name="durationIncrement"
                  type="number"
                  min="0"
                  max={bwType === "duration" ? "600" : "10"}
                  defaultValue={exercise?.durationIncrement ?? ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="cyclesPerBlock">3-week cycles before deload</label>
                <input id="cyclesPerBlock" name="cyclesPerBlock" type="number" min="1" max="12" required defaultValue={exercise?.cyclesPerBlock ?? 2} className="input" />
              </div>
            </>
          )}
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
              <label className="label" htmlFor="trainingMax">{typeChanged ? "New training max" : "Current training max"} ({unit})</label>
              <input id="trainingMax" name="trainingMax" type="number" step="any" min={progression === "duration" ? "0" : "1"} required={progression !== "duration"} defaultValue={exercise.trainingMax || ""} className="input" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="cyclesPerBlock">3-week cycles before deload</label>
            <input id="cyclesPerBlock" name="cyclesPerBlock" type="number" min="1" max="12" required defaultValue={exercise?.cyclesPerBlock ?? 2} className="input" />
          </div>
          <ProgressionFields
            progression={exercise && exercise.progression !== "reps" ? (exercise.progression as ProgressionType) : undefined}
            onTypeChange={setProgression}
            setCount={exercise?.setCount}
            repTarget={exercise?.repTarget}
            durationIncrement={exercise?.durationIncrement}
            jokersEnabled={exercise?.jokersEnabled}
            unit={unit}
            increment={exercise?.increment || (unit === "kg" ? 2.5 : 5)}
          />
        </>
      )}
      {typeChanged && (
        <p className="rounded-lg border border-orange-500/60 bg-orange-500/10 px-3 py-2 text-sm sm:col-span-2">
          Changing the progression type keeps all of your logged workouts, but restarts the schedule: the cycle position goes back to
          the start and the settings above become the new baseline.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button className="btn" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>}
        {saveError && <p role="alert" className="w-full text-sm text-red-600">{saveError}</p>}
      </div>
    </form>
  );
}
