/**
 * Identifies one in-progress workout: the exercises in it and where each is in its cycle.
 * `done` (sessions already completed this week) is only appended when non-zero, so keys for
 * once-a-week exercises are unchanged.
 */
export function draftKeyFor(exercises: { id: string; cycle: number; week: number; done?: number; sessionsDone?: number }[]): string {
  return exercises.map((e) => `${e.id}:${e.cycle}:${e.week}${(e.done ?? e.sessionsDone) ? `:${e.done ?? e.sessionsDone}` : ""}`).join(",");
}

export const DRAFT_KEY_PATTERN = /^[0-9a-f:,-]{1,800}$/i;
export const DRAFT_MAX_AGE_MS = 36 * 60 * 60 * 1000;
