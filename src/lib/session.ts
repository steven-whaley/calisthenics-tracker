import type { Exercise } from "@/db/schema";
import { DEFAULT_DURATION_SECONDS, effectiveRounding, isStraightLike, jokerSet, mainSets, schemeConfigOf, weekScheme, type WeekNumber } from "@/lib/531";
import type { SessionExercise } from "@/components/WorkoutForm";

function hintFor(ex: Exercise, week: WeekNumber, unit: string): string | undefined {
  if (!isStraightLike(ex.progression) || week === 4) return undefined;
  if (ex.progression !== "duration") {
    return `Hit ${ex.repTarget ?? 5} reps on at least half your sets to add ${ex.increment} ${unit} next week.`;
  }
  const rewards = [
    ex.trainingMax > 0 && ex.increment > 0 ? `add ${ex.increment} ${unit}` : null,
    ex.durationIncrement ? `add ${ex.durationIncrement}s to the target` : null,
  ].filter(Boolean);
  if (rewards.length === 0) return undefined;
  return `Hold ${ex.repTarget ?? DEFAULT_DURATION_SECONDS}s on at least half your sets to ${rewards.join(" and ")} next week.`;
}

export function toSessionExercise(ex: Exercise, rounding: number, unit: string): SessionExercise {
  const week = ex.currentWeek as WeekNumber;
  const r = effectiveRounding(rounding, ex.increment);
  if (ex.progression === "reps") {
    return {
      id: ex.id,
      name: ex.name,
      week,
      weekName: "",
      cycle: ex.currentCycle,
      cyclesPerBlock: ex.cyclesPerBlock,
      blockNumber: ex.blockNumber,
      trainingMax: 0,
      mains: [],
      jokers: [],
      jokersEnabled: false,
      repsOnly: true,
      plannedSets: ex.setCount ?? 3,
      goalReps: ex.repTarget,
      nextProgression: ex.nextProgression,
    };
  }
  return {
    id: ex.id,
    name: ex.name,
    week,
    weekName: weekScheme(schemeConfigOf(ex), week).name,
    cycle: ex.currentCycle,
    cyclesPerBlock: ex.cyclesPerBlock,
    blockNumber: ex.blockNumber,
    trainingMax: ex.trainingMax,
    mains: mainSets(ex.trainingMax, week, r, schemeConfigOf(ex)),
    jokers: [0, 1, 2, 3, 4].map((i) => jokerSet(ex.trainingMax, week, r, i)),
    duration: ex.progression === "duration",
    noWeight: ex.progression === "duration" && ex.trainingMax === 0,
    hint: hintFor(ex, week, unit),
    jokersEnabled: ex.jokersEnabled && ex.progression === "531" && week !== 4,
  };
}
