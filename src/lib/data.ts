import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DRAFT_MAX_AGE_MS } from "@/lib/draftKey";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  exercises,
  issueReports,
  sessions,
  templateExercises,
  templates,
  users,
  workoutDrafts,
  workouts,
  workoutSets,
  type Exercise,
  type WorkoutSet,
} from "@/db/schema";

/** The signed-in user's id from the session cookie (JWT): no database round trip. Redirects to / if signed out. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/");
  return id;
}

/** Load the user row; redirects to / if it no longer exists. */
export async function loadUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) redirect("/");
  return user;
}

export async function requireUser() {
  return loadUser(await requireUserId());
}

export async function listExercises(userId: string, includeArchived = false): Promise<Exercise[]> {
  const where = includeArchived
    ? eq(exercises.userId, userId)
    : and(eq(exercises.userId, userId), eq(exercises.archived, false));
  return db.select().from(exercises).where(where).orderBy(asc(exercises.createdAt));
}

export async function getExercise(userId: string, id: string): Promise<Exercise | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
  return row ?? null;
}

export type WorkoutWithSets = {
  id: string;
  blockNumber: number;
  cycle: number;
  week: number;
  trainingMax: number;
  notes: string | null;
  completedAt: Date;
  sets: WorkoutSet[];
};

/** One exercise's logged workouts, oldest first, with their sets. `limit` keeps only the latest N. */
export async function getHistory(userId: string, exerciseId: string, limit?: number): Promise<WorkoutWithSets[]> {
  const base = db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.exerciseId, exerciseId)));
  const ws = limit
    ? (await base.orderBy(desc(workouts.completedAt)).limit(limit)).reverse()
    : await base.orderBy(asc(workouts.completedAt));
  return attachSets(ws);
}

type WorkoutRow = Pick<typeof workouts.$inferSelect, "id" | "blockNumber" | "cycle" | "week" | "trainingMax" | "notes" | "completedAt">;

async function attachSets(ws: WorkoutRow[]): Promise<WorkoutWithSets[]> {
  if (ws.length === 0) return [];
  const sets = await db
    .select()
    .from(workoutSets)
    .where(inArray(workoutSets.workoutId, ws.map((w) => w.id)))
    .orderBy(asc(workoutSets.kind), asc(workoutSets.setNumber));
  const byWorkout = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = byWorkout.get(s.workoutId);
    if (list) list.push(s);
    else byWorkout.set(s.workoutId, [s]);
  }
  return ws.map((w) => ({
    id: w.id,
    blockNumber: w.blockNumber,
    cycle: w.cycle,
    week: w.week,
    trainingMax: w.trainingMax,
    notes: w.notes,
    completedAt: w.completedAt,
    sets: byWorkout.get(w.id) ?? [],
  }));
}

export type ExerciseHistory = {
  /** Every workout ever logged for the exercise. */
  total: number;
  /** The latest `limit` workouts, oldest first, with their sets. */
  workouts: WorkoutWithSets[];
};

/**
 * History for all of a user's exercises in two queries (workouts, then the sets of the retained workouts),
 * keeping only the latest `limit` workouts per exercise so the page doesn't grow without bound.
 */
export async function getProgressHistories(userId: string, limit: number): Promise<Map<string, ExerciseHistory>> {
  const rows = await db
    .select({
      id: workouts.id,
      exerciseId: workouts.exerciseId,
      blockNumber: workouts.blockNumber,
      cycle: workouts.cycle,
      week: workouts.week,
      trainingMax: workouts.trainingMax,
      notes: workouts.notes,
      completedAt: workouts.completedAt,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(asc(workouts.completedAt));
  const byExercise = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byExercise.get(r.exerciseId);
    if (list) list.push(r);
    else byExercise.set(r.exerciseId, [r]);
  }
  const kept = [...byExercise.values()].flatMap((list) => list.slice(-limit));
  const withSets = new Map((await attachSets(kept)).map((w) => [w.id, w]));
  const out = new Map<string, ExerciseHistory>();
  for (const [exerciseId, list] of byExercise) {
    out.set(exerciseId, { total: list.length, workouts: list.slice(-limit).map((w) => withSets.get(w.id)!) });
  }
  return out;
}

export async function recentWorkouts(userId: string, limit = 5) {
  return db
    .select({
      id: workouts.id,
      exerciseName: exercises.name,
      week: workouts.week,
      cycle: workouts.cycle,
      completedAt: workouts.completedAt,
    })
    .from(workouts)
    .innerJoin(exercises, eq(exercises.id, workouts.exerciseId))
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.completedAt))
    .limit(limit);
}

export type TemplateWithExercises = {
  id: string;
  name: string;
  exercises: Exercise[]; // ordered, archived excluded
};

export async function listTemplates(userId: string): Promise<TemplateWithExercises[]> {
  const ts = await db.select().from(templates).where(eq(templates.userId, userId)).orderBy(asc(templates.createdAt));
  if (ts.length === 0) return [];
  const rows = await db
    .select({ templateId: templateExercises.templateId, position: templateExercises.position, ex: exercises })
    .from(templateExercises)
    .innerJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
    .where(inArray(templateExercises.templateId, ts.map((t) => t.id)))
    .orderBy(asc(templateExercises.position));
  return ts.map((t) => ({
    id: t.id,
    name: t.name,
    exercises: rows.filter((r) => r.templateId === t.id && !r.ex.archived).map((r) => r.ex),
  }));
}

export async function getTemplate(userId: string, id: string): Promise<TemplateWithExercises | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const all = await listTemplates(userId);
  return all.find((t) => t.id === id) ?? null;
}

export type DayWorkout = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  cyclesPerBlock: number;
  progression: string;
  increment: number;
  sessionName: string | null;
  sessionId: string | null;
  sessionDurationSeconds: number | null;
  blockNumber: number;
  cycle: number;
  week: number;
  trainingMax: number;
  notes: string | null;
  sets: WorkoutSet[];
};

/** Workouts with exercise info for dates in [from, to). Sets are only loaded when withSets is true. */
export async function getWorkoutsInRange(
  userId: string,
  from: string,
  to: string,
  withSets = false,
): Promise<(DayWorkout & { performedOn: string })[]> {
  const rows = await db
    .select({
      id: workouts.id,
      performedOn: workouts.performedOn,
      exerciseId: workouts.exerciseId,
      exerciseName: exercises.name,
      cyclesPerBlock: exercises.cyclesPerBlock,
      progression: exercises.progression,
      increment: exercises.increment,
      sessionName: sessions.name,
      sessionId: workouts.sessionId,
      sessionDurationSeconds: sessions.durationSeconds,
      blockNumber: workouts.blockNumber,
      cycle: workouts.cycle,
      week: workouts.week,
      trainingMax: workouts.trainingMax,
      notes: workouts.notes,
    })
    .from(workouts)
    .innerJoin(exercises, eq(exercises.id, workouts.exerciseId))
    .leftJoin(sessions, eq(sessions.id, workouts.sessionId))
    .where(and(eq(workouts.userId, userId), gte(workouts.performedOn, from), lt(workouts.performedOn, to)))
    .orderBy(asc(workouts.performedOn), asc(workouts.completedAt));
  const sets =
    withSets && rows.length
      ? await db
          .select()
          .from(workoutSets)
          .where(inArray(workoutSets.workoutId, rows.map((r) => r.id)))
          .orderBy(asc(workoutSets.kind), asc(workoutSets.setNumber))
      : [];
  return rows.map((r) => ({ ...r, sets: sets.filter((s) => s.workoutId === r.id) }));
}

export async function listIssueReports(userId: string, limit = 20) {
  return db
    .select()
    .from(issueReports)
    .where(eq(issueReports.userId, userId))
    .orderBy(desc(issueReports.createdAt))
    .limit(limit);
}

/** The user's saved in-progress workout for this exact workout (null if none, expired or unreadable). */
export async function getWorkoutDraft(
  userId: string,
  key: string,
): Promise<{ fields: Record<string, string>; updatedAt: string } | null> {
  const [row] = await db
    .select()
    .from(workoutDrafts)
    .where(and(eq(workoutDrafts.userId, userId), eq(workoutDrafts.draftKey, key)));
  if (!row || Date.now() - row.updatedAt.getTime() > DRAFT_MAX_AGE_MS) return null;
  try {
    const fields = JSON.parse(row.data) as Record<string, string>;
    return { fields, updatedAt: row.updatedAt.toISOString() };
  } catch {
    return null;
  }
}

/** The user's unexpired in-progress workouts that have at least one set logged, newest first. */
export async function listWorkoutDrafts(userId: string): Promise<{ draftKey: string; updatedAt: Date; setsLogged: number }[]> {
  const rows = await db
    .select()
    .from(workoutDrafts)
    .where(eq(workoutDrafts.userId, userId))
    .orderBy(desc(workoutDrafts.updatedAt));
  const out: { draftKey: string; updatedAt: Date; setsLogged: number }[] = [];
  for (const r of rows) {
    if (Date.now() - r.updatedAt.getTime() > DRAFT_MAX_AGE_MS) continue;
    try {
      const f = JSON.parse(r.data) as Record<string, string>;
      // A set counts as logged when it is ticked done or has reps entered.
      const keys = new Set<string>();
      for (const [k, v] of Object.entries(f)) {
        if (k.endsWith("_done") && v === "on") keys.add(k.slice(0, -5));
        else if (/_main_\d+_reps$|_joker_\d+_reps$/.test(k) && v !== "") keys.add(k.replace(/_reps$/, ""));
      }
      // A running workout timer also means the workout was started, even before any set is logged.
      if (keys.size > 0 || f.__startedAt) out.push({ draftKey: r.draftKey, updatedAt: r.updatedAt, setsLogged: keys.size });
    } catch {
      /* unreadable draft: ignore */
    }
  }
  return out;
}
