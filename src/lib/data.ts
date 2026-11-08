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

export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/");
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) redirect("/");
  return user;
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

export async function getHistory(userId: string, exerciseId: string): Promise<WorkoutWithSets[]> {
  const ws = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.exerciseId, exerciseId)))
    .orderBy(asc(workouts.completedAt));
  if (ws.length === 0) return [];
  const sets = await db
    .select()
    .from(workoutSets)
    .where(inArray(workoutSets.workoutId, ws.map((w) => w.id)))
    .orderBy(asc(workoutSets.kind), asc(workoutSets.setNumber));
  return ws.map((w) => ({
    id: w.id,
    blockNumber: w.blockNumber,
    cycle: w.cycle,
    week: w.week,
    trainingMax: w.trainingMax,
    notes: w.notes,
    completedAt: w.completedAt,
    sets: sets.filter((s) => s.workoutId === w.id),
  }));
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
