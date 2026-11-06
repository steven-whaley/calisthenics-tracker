import type { Exercise } from "@/db/schema";
import type { PickableExercise } from "@/components/TemplateForm";
import { PROGRESSION_LABELS, type ProgressionType } from "@/lib/531";

export function toPickable(exs: Exercise[]): PickableExercise[] {
  return exs.map((e) => ({
    id: e.id,
    name: e.name,
    detail: e.progression === "reps" ? "Bodyweight" : PROGRESSION_LABELS[e.progression as ProgressionType],
  }));
}
