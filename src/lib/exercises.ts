import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, type User } from "@/db/schema";
import { defaultIncrement, roundWeight, type ProgressionType } from "@/lib/531";

export const MAX_EXERCISES_PER_USER = 60;

export type NewExerciseInput = {
  name: string;
  category: "upper" | "lower" | "other" | "bodyweight";
  /** Not used for bodyweight-only exercises. */
  trainingMax?: number;
  nextProgression?: string | null;
  progression?: ProgressionType;
  setCount?: number;
  repTarget?: number;
  increment?: number;
  cyclesPerBlock?: number;
  jokersEnabled?: boolean;
};

export async function insertExercise(user: User, input: NewExerciseInput) {
  const [{ n }] = await db.select({ n: count() }).from(exercises).where(eq(exercises.userId, user.id));
  if (n >= MAX_EXERCISES_PER_USER) throw new Error(`Exercise limit (${MAX_EXERCISES_PER_USER}) reached`);
  const bodyweight = input.category === "bodyweight";
  if (!bodyweight && !input.trainingMax) throw new Error("A training max is required for weighted exercises");
  const tm = bodyweight ? 0 : roundWeight(input.trainingMax!, user.rounding);
  const progression = bodyweight ? "reps" : (input.progression === "reps" ? "531" : (input.progression ?? "531"));
  const [row] = await db
    .insert(exercises)
    .values({
      userId: user.id,
      name: input.name.trim(),
      category: input.category,
      startingTm: tm,
      trainingMax: tm,
      progression,
      setCount: bodyweight ? (input.setCount ?? 3) : progression === "straight_sets" ? (input.setCount ?? null) : null,
      repTarget: bodyweight || progression === "straight_sets" ? (input.repTarget ?? null) : null,
      nextProgression: bodyweight ? (input.nextProgression?.trim() || null) : null,
      increment: bodyweight ? 0 : (input.increment ?? defaultIncrement(input.category, user.unit)),
      cyclesPerBlock: input.cyclesPerBlock ?? 2,
      jokersEnabled: progression === "531" && (input.jokersEnabled ?? false),
    })
    .returning();
  return row;
}
