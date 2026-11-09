import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, type User } from "@/db/schema";
import { defaultIncrement, effectiveRounding, roundWeight, type ProgressionType } from "@/lib/531";

export const MAX_EXERCISES_PER_USER = 60;

/** An error whose message is safe to show to the user. */
export class UserFacingError extends Error {}

export type NewExerciseInput = {
  name: string;
  category: "upper" | "lower" | "other" | "bodyweight";
  /** Not used for bodyweight-only exercises. */
  trainingMax?: number;
  nextProgression?: string | null;
  progression?: ProgressionType;
  setCount?: number;
  repTarget?: number;
  /** Bodyweight only: amount added to the target (reps or seconds) after a successful week. */
  durationIncrement?: number;
  increment?: number;
  cyclesPerBlock?: number;
  jokersEnabled?: boolean;
};

export async function insertExercise(user: User, input: NewExerciseInput) {
  const [{ n }] = await db.select({ n: count() }).from(exercises).where(eq(exercises.userId, user.id));
  if (n >= MAX_EXERCISES_PER_USER) throw new UserFacingError(`Exercise limit (${MAX_EXERCISES_PER_USER}) reached`);
  const bodyweight = input.category === "bodyweight";
  if (!bodyweight && !input.trainingMax) throw new UserFacingError("A training max is required for weighted exercises");
  const tm = bodyweight ? 0 : roundWeight(input.trainingMax!, effectiveRounding(user.rounding, input.increment ?? defaultIncrement(input.category, user.unit)));
  // Bodyweight exercises are weightless straight sets (reps) or timed sets (seconds).
  const progression = bodyweight ? (input.progression === "duration" ? "duration" : "straight_sets") : (input.progression === "reps" ? "531" : (input.progression ?? "531"));
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
      nextProgression: null,
      durationIncrement: bodyweight ? (input.durationIncrement ?? null) : null,
      increment: bodyweight ? 0 : (input.increment ?? defaultIncrement(input.category, user.unit)),
      cyclesPerBlock: input.cyclesPerBlock ?? 2,
      jokersEnabled: progression === "531" && (input.jokersEnabled ?? false),
    })
    .returning();
  return row;
}
