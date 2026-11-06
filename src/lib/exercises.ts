import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, type User } from "@/db/schema";
import { defaultIncrement, roundWeight, type ProgressionType } from "@/lib/531";

export const MAX_EXERCISES_PER_USER = 60;

export type NewExerciseInput = {
  name: string;
  category: "upper" | "lower" | "other";
  trainingMax: number;
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
  const tm = roundWeight(input.trainingMax, user.rounding);
  const progression = input.progression ?? "531";
  const [row] = await db
    .insert(exercises)
    .values({
      userId: user.id,
      name: input.name.trim(),
      category: input.category,
      startingTm: tm,
      trainingMax: tm,
      progression,
      setCount: progression === "straight_sets" ? (input.setCount ?? null) : null,
      repTarget: progression === "straight_sets" ? (input.repTarget ?? null) : null,
      increment: input.increment ?? defaultIncrement(input.category, user.unit),
      cyclesPerBlock: input.cyclesPerBlock ?? 2,
      jokersEnabled: progression === "531" && (input.jokersEnabled ?? false),
    })
    .returning();
  return row;
}
