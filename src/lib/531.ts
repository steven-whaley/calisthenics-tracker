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

export type ProgressionType = "531" | "pyramid" | "reverse_pyramid" | "straight_sets" | "duration" | "reps";

/** Progressions that use weights. "reps" is the only option for bodyweight-only exercises. */
export const WEIGHTED_PROGRESSION_TYPES = ["531", "pyramid", "reverse_pyramid", "straight_sets"] as const;
/** Weighted types plus timed holds, as offered in the exercise form. */
export const FORM_PROGRESSION_TYPES = [...WEIGHTED_PROGRESSION_TYPES, "duration"] as const;
export const PROGRESSION_TYPES = [...WEIGHTED_PROGRESSION_TYPES, "reps"] as const;

export type ExerciseCategory = "upper" | "lower" | "other" | "bodyweight";

export const PROGRESSION_LABELS: Record<ProgressionType, string> = {
  "531": "5/3/1 style",
  pyramid: "Pyramid",
  reverse_pyramid: "Reverse pyramid",
  straight_sets: "Straight sets",
  duration: "Duration (timed sets)",
  reps: "Just reps",
};

export const PROGRESSION_HELP: Record<ProgressionType, string> = {
  "531": "Three working sets with a rep-out (AMRAP) top set. Supports joker sets.",
  pyramid: "Four sets climbing in weight while reps drop.",
  reverse_pyramid: "Heaviest set first, then lighter sets for more reps.",
  straight_sets: "Same weight and reps every set (you choose sets × reps).",
  duration: "Hold or work for a target time each set (you choose sets × seconds). Weight is optional.",
  reps: "No weights or schedule. Log your reps and move on to the next variation when you are ready.",
};

/** What defines an exercise's set scheme. */
export type SchemeConfig = {
  type: ProgressionType;
  setCount?: number | null;
  repTarget?: number | null;
};

export function schemeConfigOf(ex: {
  progression: string;
  setCount: number | null;
  repTarget: number | null;
}): SchemeConfig {
  return { type: ex.progression as ProgressionType, setCount: ex.setCount, repTarget: ex.repTarget };
}

export const DEFAULT_STRAIGHT_SETS = 5;
export const DEFAULT_STRAIGHT_REPS = 5;
export const DEFAULT_DURATION_SETS = 3;
export const DEFAULT_DURATION_SECONDS = 30;

/** Straight sets and timed sets share the same performance-driven weekly progression. */
export const isStraightLike = (type: string) => type === "straight_sets" || type === "duration";

// Non-5/3/1 schemes share the same week structure (3 build weeks + deload) so cycles,
// block tracking and the calendar work identically for every progression type.
const WEEK_NAMES: Record<WeekNumber, string> = { 1: "Volume week", 2: "Build week", 3: "Peak week", 4: "Deload" };

const pairs = (rows: [number, number][]): SetScheme[] =>
  rows.map(([pct, reps]) => ({ pct: pct / 100, reps, amrap: false }));

const PYRAMID: Record<WeekNumber, SetScheme[]> = {
  1: pairs([[60, 10], [70, 8], [75, 6], [80, 4]]),
  2: pairs([[65, 9], [75, 7], [80, 4], [85, 3]]),
  3: pairs([[70, 8], [75, 7], [85, 4], [90, 3]]),
  4: pairs([[40, 10], [50, 8], [60, 6]]),
};

const REVERSE_PYRAMID: Record<WeekNumber, SetScheme[]> = {
  1: pairs([[80, 6], [72, 8], [64, 10]]),
  2: pairs([[85, 5], [77, 7], [69, 9]]),
  3: pairs([[90, 4], [82, 6], [74, 8]]),
  4: pairs([[55, 6], [50, 8], [45, 10]]),
};

// Straight sets use the working weight as-is; it only moves up when reps are hit (see evaluateStraightSets).
const STRAIGHT_PCT: Record<WeekNumber, number> = { 1: 1, 2: 1, 3: 1, 4: 0.6 };
const STRAIGHT_WEEK_NAMES: Record<WeekNumber, string> = { 1: "Week 1", 2: "Week 2", 3: "Week 3", 4: "Deload" };

/** Share of straight sets that must hit the target reps for the weight to go up next week. */
export const STRAIGHT_SETS_PASS_RATE = 0.5;

export type LoggedSet = {
  targetWeight: number;
  targetReps: number;
  actualWeight?: number | null;
  actualReps?: number | null;
};

/** A set is "hit" when the target reps were done at (at least) the target weight. Unlogged sets are misses. */
export function evaluateStraightSets(sets: LoggedSet[]): { hit: number; total: number; passed: boolean } {
  const hit = sets.filter(
    (s) => s.actualReps != null && s.actualReps >= s.targetReps && (s.actualWeight ?? s.targetWeight) >= s.targetWeight,
  ).length;
  return { hit, total: sets.length, passed: sets.length > 0 && hit / sets.length >= STRAIGHT_SETS_PASS_RATE };
}

export function weekScheme(
  cfg: SchemeConfig,
  week: WeekNumber,
): { name: string; sets: SetScheme[] } {
  switch (cfg.type) {
    case "pyramid":
      return { name: WEEK_NAMES[week], sets: PYRAMID[week] };
    case "reverse_pyramid":
      return { name: WEEK_NAMES[week], sets: REVERSE_PYRAMID[week] };
    case "straight_sets":
    case "duration": {
      const timed = cfg.type === "duration";
      const n = cfg.setCount ?? (timed ? DEFAULT_DURATION_SETS : DEFAULT_STRAIGHT_SETS);
      // For timed sets "reps" is the target in seconds.
      const reps = cfg.repTarget ?? (timed ? DEFAULT_DURATION_SECONDS : DEFAULT_STRAIGHT_REPS);
      return {
        name: STRAIGHT_WEEK_NAMES[week],
        sets: Array.from({ length: n }, () => ({ pct: STRAIGHT_PCT[week], reps, amrap: false })),
      };
    }
    default:
      return WEEK_SCHEMES[week];
  }
}

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

/**
 * The rounding actually used for an exercise. A finer increase than the profile's rounding
 * (e.g. +0.5 with rounding 5) would otherwise be rounded away, so use the coarsest
 * plate step <= the profile rounding that the increase is a whole multiple of.
 */
export function effectiveRounding(rounding: number, increment: number): number {
  if (!(increment > 0)) return rounding;
  const divides = (c: number) => Math.abs(increment / c - Math.round(increment / c)) < 1e-9;
  const candidates = [...new Set([rounding, 5, 2.5, 1.25, 1, 0.5, 0.25])].filter((c) => c <= rounding).sort((a, b) => b - a);
  return candidates.find(divides) ?? Math.min(rounding, increment);
}

export function mainSets(
  tm: number,
  week: WeekNumber,
  rounding: number,
  cfg: SchemeConfig = { type: "531" },
): TargetSet[] {
  return weekScheme(cfg, week).sets.map((s, i) => ({
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
export function advance(s: ProgressionState, opts: { bumpAtCycleEnd?: boolean } = {}): ProgressionState {
  const bump = opts.bumpAtCycleEnd ?? true;
  if (s.currentWeek === 4) {
    return { ...s, currentCycle: 1, currentWeek: 1, blockNumber: s.blockNumber + 1 };
  }
  if (s.currentWeek < 3) {
    return { ...s, currentWeek: (s.currentWeek + 1) as WeekNumber };
  }
  const trainingMax = s.trainingMax + (bump ? s.increment : 0);
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
  cfg: SchemeConfig = { type: "531" },
): ProjectedCycle[] {
  const out: ProjectedCycle[] = [];
  for (let c = 1; c <= cyclesPerBlock; c++) {
    const tm = startTm + (c - 1) * increment;
    out.push({
      cycle: c,
      trainingMax: tm,
      weeks: ([1, 2, 3] as WeekNumber[]).map((w) => ({
        week: w,
        name: weekScheme(cfg, w).name,
        sets: mainSets(tm, w, rounding, cfg),
      })),
    });
  }
  const tm = startTm + cyclesPerBlock * increment;
  out.push({
    cycle: "deload",
    trainingMax: tm,
    weeks: [{ week: 4, name: weekScheme(cfg, 4).name, sets: mainSets(tm, 4, rounding, cfg) }],
  });
  return out;
}

export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function defaultIncrement(category: string, unit: "lb" | "kg"): number {
  if (category === "bodyweight") return 0;
  const lower = category === "lower";
  if (unit === "kg") return lower ? 5 : 2.5;
  return lower ? 10 : 5;
}
