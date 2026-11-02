import type { Exercise } from "@/db/schema";
import { WEEK_SCHEMES, jokerSet, mainSets, type WeekNumber } from "@/lib/531";
import type { SessionExercise } from "@/components/WorkoutForm";

export function toSessionExercise(ex: Exercise, rounding: number): SessionExercise {
  const week = ex.currentWeek as WeekNumber;
  return {
    id: ex.id,
    name: ex.name,
    week,
    weekName: WEEK_SCHEMES[week].name,
    cycle: ex.currentCycle,
    cyclesPerBlock: ex.cyclesPerBlock,
    blockNumber: ex.blockNumber,
    trainingMax: ex.trainingMax,
    mains: mainSets(ex.trainingMax, week, rounding),
    jokers: [0, 1, 2, 3, 4].map((i) => jokerSet(ex.trainingMax, week, rounding, i)),
    jokersEnabled: ex.jokersEnabled && week !== 4,
  };
}
