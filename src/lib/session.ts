import type { Exercise } from "@/db/schema";
import { jokerSet, mainSets, schemeConfigOf, weekScheme, type WeekNumber } from "@/lib/531";
import type { SessionExercise } from "@/components/WorkoutForm";

export function toSessionExercise(ex: Exercise, rounding: number, unit: string): SessionExercise {
  const week = ex.currentWeek as WeekNumber;
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
    mains: mainSets(ex.trainingMax, week, rounding, schemeConfigOf(ex)),
    jokers: [0, 1, 2, 3, 4].map((i) => jokerSet(ex.trainingMax, week, rounding, i)),
    hint:
      ex.progression === "straight_sets" && week !== 4
        ? `Hit ${ex.repTarget ?? 5} reps on at least half your sets to add ${ex.increment} ${unit} next week.`
        : undefined,
    jokersEnabled: ex.jokersEnabled && ex.progression === "531" && week !== 4,
  };
}
