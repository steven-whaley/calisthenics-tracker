// Pure 5/3/1 logic: weekly schemes, progression, joker sets, block projection.

export type WeekNumber = 1 | 2 | 3 | 4;

export type SetScheme = { pct: number; reps: number; amrap: boolean };

export const WEEK_SCHEMES: Record<WeekNumber, { name: string; sets: SetScheme[] }> = {
  1: {
    name: "5s week",
    sets: [
      { pct: 0.65, reps: 5, amrap: false },
      { pct: 0.75, reps: 5, amrap: false },
      { pct: 0.85, reps: 5, amrap: true },
    ],
  },
  2: {
    name: "3s week",
    sets: [
      { pct: 0.7, reps: 3, amrap: false },
      { pct: 0.8, reps: 3, amrap: false },
      { pct: 0.9, reps: 3, amrap: true },
    ],
  },
  3: {
    name: "5/3/1 week",
    sets: [
      { pct: 0.75, reps: 5, amrap: false },
      { pct: 0.85, reps: 3, amrap: false },
      { pct: 0.95, reps: 1, amrap: true },
    ],
  },
  4: {
    name: "Deload",
    sets: [
      { pct: 0.4, reps: 5, amrap: false },
      { pct: 0.5, reps: 5, amrap: false },
      { pct: 0.6, reps: 5, amrap: false },
    ],
  },
};

export type TargetSet = {
  kind: "main" | "joker";
  setNumber: number;
  pct: number;
  weight: number;
  reps: number;
  amrap: boolean;
};

export function roundWeight(weight: number, increment: number): number {
  if (increment <= 0) return Math.round(weight * 100) / 100;
  const r = Math.round(weight / increment) * increment;
  return Math.round(r * 100) / 100;
}

export function mainSets(tm: number, week: WeekNumber, rounding: number): TargetSet[] {
  return WEEK_SCHEMES[week].sets.map((s, i) => ({
    kind: "main",
    setNumber: i + 1,
    pct: s.pct,
    weight: roundWeight(tm * s.pct, rounding),
    reps: s.reps,
    amrap: s.amrap,
  }));
}

/** Joker sets continue past the top set in 5% steps (3 reps first on 5s/3s weeks, then singles). */
export function jokerSet(
  tm: number,
  week: WeekNumber,
  rounding: number,
  index: number,
): TargetSet {
  const top = WEEK_SCHEMES[week].sets[WEEK_SCHEMES[week].sets.length - 1].pct;
  const pct = Math.round((top + 0.05 * (index + 1)) * 100) / 100;
  const reps = week === 3 || index > 0 ? 1 : 3;
  return {
    kind: "joker",
    setNumber: index + 1,
    pct,
    weight: roundWeight(tm * pct, rounding),
    reps,
    amrap: false,
  };
}

export type ProgressionState = {
  trainingMax: number;
  increment: number;
  cyclesPerBlock: number;
  currentCycle: number;
  currentWeek: WeekNumber;
  blockNumber: number;
};

/** State after completing the current week. TM goes up after each 3-week cycle; deload follows the last cycle of a block. */
export function advance(s: ProgressionState): ProgressionState {
  if (s.currentWeek === 4) {
    return { ...s, currentCycle: 1, currentWeek: 1, blockNumber: s.blockNumber + 1 };
  }
  if (s.currentWeek < 3) {
    return { ...s, currentWeek: (s.currentWeek + 1) as WeekNumber };
  }
  const trainingMax = s.trainingMax + s.increment;
  if (s.currentCycle >= s.cyclesPerBlock) {
    return { ...s, trainingMax, currentWeek: 4 };
  }
  return { ...s, trainingMax, currentCycle: s.currentCycle + 1, currentWeek: 1 };
}

export type ProjectedWeek = { week: WeekNumber; name: string; sets: TargetSet[] };
export type ProjectedCycle = { cycle: number | "deload"; trainingMax: number; weeks: ProjectedWeek[] };

/** Full progression for one block starting from the given training max. */
export function projectBlock(
  startTm: number,
  increment: number,
  cyclesPerBlock: number,
  rounding: number,
): ProjectedCycle[] {
  const out: ProjectedCycle[] = [];
  for (let c = 1; c <= cyclesPerBlock; c++) {
    const tm = startTm + (c - 1) * increment;
    out.push({
      cycle: c,
      trainingMax: tm,
      weeks: ([1, 2, 3] as WeekNumber[]).map((w) => ({
        week: w,
        name: WEEK_SCHEMES[w].name,
        sets: mainSets(tm, w, rounding),
      })),
    });
  }
  const tm = startTm + cyclesPerBlock * increment;
  out.push({
    cycle: "deload",
    trainingMax: tm,
    weeks: [{ week: 4, name: WEEK_SCHEMES[4].name, sets: mainSets(tm, 4, rounding) }],
  });
  return out;
}

export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function defaultIncrement(category: string, unit: "lb" | "kg"): number {
  const lower = category === "lower";
  if (unit === "kg") return lower ? 5 : 2.5;
  return lower ? 10 : 5;
}
