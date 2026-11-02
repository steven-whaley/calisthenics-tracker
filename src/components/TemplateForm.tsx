import type { Exercise } from "@/db/schema";

export function TemplateForm({
  action,
  exercises,
  name,
  selected,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  exercises: Exercise[];
  name?: string;
  /** exerciseId -> 1-based order */
  selected?: Map<string, number>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">Template name</label>
        <input id="name" name="name" required maxLength={60} defaultValue={name} className="input" placeholder="Push day" />
      </div>
      <div className="space-y-2">
        <p className="label">Exercises (order = the number)</p>
        {exercises.length === 0 && <p className="text-sm opacity-70">Create some exercises first.</p>}
        {exercises.map((ex, i) => (
          <div key={ex.id} className="flex items-center gap-3">
            <input type="checkbox" id={`inc_${ex.id}`} name={`inc_${ex.id}`} defaultChecked={selected?.has(ex.id)} />
            <label htmlFor={`inc_${ex.id}`} className="flex-1 text-sm">{ex.name}</label>
            <input
              name={`ord_${ex.id}`}
              type="number"
              min="1"
              max="99"
              defaultValue={selected?.get(ex.id) ?? i + 1}
              className="input !w-20"
              aria-label={`${ex.name} order`}
            />
          </div>
        ))}
      </div>
      <button className="btn">{submitLabel}</button>
    </form>
  );
}
