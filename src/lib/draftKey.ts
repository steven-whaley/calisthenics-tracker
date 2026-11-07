/** Identifies one in-progress workout: the exercises in it and where each is in its cycle. */
export function draftKeyFor(exercises: { id: string; cycle: number; week: number }[]): string {
  return exercises.map((e) => `${e.id}:${e.cycle}:${e.week}`).join(",");
}

export const DRAFT_KEY_PATTERN = /^[0-9a-f:,-]{1,800}$/i;
export const DRAFT_MAX_AGE_MS = 36 * 60 * 60 * 1000;
