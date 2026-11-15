import type { CatalogExercise } from "@/db/schema";

/** A library exercise as sent to the client: a suggested setup with no training max. */
export type CatalogItem = {
  id: string;
  name: string;
  category: "upper" | "lower" | "other" | "bodyweight";
  progression: "531" | "pyramid" | "reverse_pyramid" | "straight_sets" | "duration";
  setCount: number | null;
  repTarget: number | null;
  durationIncrement: number | null;
};

export const toCatalogItem = (c: CatalogExercise): CatalogItem => ({
  id: c.id,
  name: c.name,
  category: c.category,
  progression: c.progression,
  setCount: c.setCount,
  repTarget: c.repTarget,
  durationIncrement: c.durationIncrement,
});

/** Offered by the admin page's "Load starter set" button. */
export const STARTER_CATALOG: Omit<CatalogItem, "id">[] = [
  { name: "Squat", category: "lower", progression: "531", setCount: null, repTarget: null, durationIncrement: null },
  { name: "Deadlift", category: "lower", progression: "531", setCount: null, repTarget: null, durationIncrement: null },
  { name: "Bench Press", category: "upper", progression: "531", setCount: null, repTarget: null, durationIncrement: null },
  { name: "Overhead Press", category: "upper", progression: "531", setCount: null, repTarget: null, durationIncrement: null },
  { name: "Barbell Row", category: "upper", progression: "straight_sets", setCount: 5, repTarget: 10, durationIncrement: null },
  { name: "Weighted Pull-up", category: "upper", progression: "straight_sets", setCount: 5, repTarget: 5, durationIncrement: null },
  { name: "Dip", category: "upper", progression: "straight_sets", setCount: 5, repTarget: 10, durationIncrement: null },
  { name: "Push-up", category: "bodyweight", progression: "straight_sets", setCount: 3, repTarget: 10, durationIncrement: 1 },
  { name: "Pull-up", category: "bodyweight", progression: "straight_sets", setCount: 3, repTarget: 5, durationIncrement: 1 },
  { name: "Plank", category: "bodyweight", progression: "duration", setCount: 3, repTarget: 30, durationIncrement: 5 },
  { name: "Hollow Hold", category: "bodyweight", progression: "duration", setCount: 3, repTarget: 20, durationIncrement: 5 },
];
