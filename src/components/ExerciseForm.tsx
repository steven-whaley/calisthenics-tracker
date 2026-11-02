import type { Exercise } from "@/db/schema";

export function ExerciseForm({
  action,
  exercise,
  unit,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  exercise?: Exercise;
  unit: string;
  submitLabel: string;
}) {
  const isNew = !exercise;
  return (
    <form action={action} className="card grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Exercise name</label>
        <input id="name" name="name" required maxLength={60} defaultValue={exercise?.name} className="input" placeholder="Weighted pull-up" />
      </div>
      <div>
        <label className="label" htmlFor="category">Type</label>
        <select id="category" name="category" defaultValue={exercise?.category ?? "upper"} className="input">
          <option value="upper">Upper body (+{unit === "kg" ? "2.5" : "5"} per cycle suggested)</option>
          <option value="lower">Lower body (+{unit === "kg" ? "5" : "10"} per cycle suggested)</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="increment">Increase per cycle ({unit})</label>
        <input id="increment" name="increment" type="number" step="any" min="0.5" required defaultValue={exercise?.increment ?? (unit === "kg" ? 2.5 : 5)} className="input" />
      </div>
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
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="jokersEnabled" defaultChecked={exercise?.jokersEnabled} />
        Enable joker sets
      </label>
      <div className="sm:col-span-2">
        <button className="btn">{submitLabel}</button>
      </div>
    </form>
  );
}
