"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { exercises, sessions, templateExercises, templates, users, workouts, workoutSets } from "@/db/schema";
import { advance, mainSets, roundWeight, type WeekNumber } from "@/lib/531";
import { getExercise, getTemplate, listExercises, requireUser } from "@/lib/data";

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.enum(["upper", "lower", "other"]),
  increment: num(0.5, 100),
  cyclesPerBlock: z.coerce.number().int().min(1).max(12),
});

export async function createExercise(formData: FormData) {
  const user = await requireUser();
  const base = exerciseSchema.parse(Object.fromEntries(formData));

  // Training max can be entered directly, or derived from a 1RM and a TM percentage.
  const tmRaw = formData.get("trainingMax");
  const oneRm = formData.get("oneRepMax");
  const pct = Number(formData.get("tmPercent") || 90) / 100;
  let tm = tmRaw ? Number(tmRaw) : oneRm ? Number(oneRm) * pct : NaN;
  if (!Number.isFinite(tm) || tm <= 0) throw new Error("Enter a training max or a 1RM");
  tm = roundWeight(tm, user.rounding);

  const [row] = await db
    .insert(exercises)
    .values({
      userId: user.id,
      ...base,
      startingTm: tm,
      trainingMax: tm,
      jokersEnabled: formData.get("jokersEnabled") === "on",
    })
    .returning({ id: exercises.id });
  revalidatePath("/", "layout");
  redirect(`/exercises/${row.id}`);
}

export async function updateExercise(id: string, formData: FormData) {
  const user = await requireUser();
  const ex = await getExercise(user.id, id);
  if (!ex) throw new Error("Not found");
  const base = exerciseSchema.parse(Object.fromEntries(formData));
  const tm = num(1, 10000).parse(formData.get("trainingMax"));
  await db
    .update(exercises)
    .set({ ...base, trainingMax: tm, jokersEnabled: formData.get("jokersEnabled") === "on" })
    .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath("/", "layout");
  redirect(`/exercises/${id}`);
}

export async function archiveExercise(id: string) {
  const user = await requireUser();
  await db
    .update(exercises)
    .set({ archived: true })
    .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath("/", "layout");
  redirect("/exercises");
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const data = z
    .object({
      name: z.string().trim().max(80),
      unit: z.enum(["lb", "kg"]),
      rounding: num(0.25, 25),
    })
    .parse(Object.fromEntries(formData));
  await db
    .update(users)
    .set({ name: data.name || null, unit: data.unit, rounding: data.rounding })
    .where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

const optNum = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(5000).nullable());
const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(1000).nullable());

/**
 * Log one training day. The form can contain several exercises (from a template) or just one.
 * Each included exercise is recorded against its current position in the cycle, then advanced.
 */
export async function completeSession(templateId: string | null, formData: FormData) {
  const user = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const performedOn = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch(today).parse(formData.get("date"));
  const notes = String(formData.get("notes") || "").trim().slice(0, 500) || null;

  let name = "Single exercise";
  if (templateId) {
    const t = await getTemplate(user.id, templateId);
    if (!t) throw new Error("Template not found");
    name = t.name;
  }

  const sessionId = crypto.randomUUID();
  const statements: unknown[] = [];
  const ids = [...new Set(formData.getAll("exerciseId").map(String))];
  let logged = 0;

  for (const id of ids) {
    if (formData.get(`include_${id}`) !== "on") continue;
    const ex = await getExercise(user.id, id);
    if (!ex || ex.archived) continue;
    const p = `x_${id}_`;
    // Skip stale submissions (e.g. a double submit) for exercises that already moved on.
    if (Number(formData.get(`${p}week`)) !== ex.currentWeek || Number(formData.get(`${p}cycle`)) !== ex.currentCycle) continue;

    const workoutId = crypto.randomUUID();
    const targets = mainSets(ex.trainingMax, ex.currentWeek as WeekNumber, user.rounding);
    const setRows: (typeof workoutSets.$inferInsert)[] = targets.map((t, i) => ({
      workoutId,
      kind: "main",
      setNumber: t.setNumber,
      targetWeight: t.weight,
      targetReps: t.reps,
      isAmrap: t.amrap,
      actualWeight: optNum.parse(formData.get(`${p}main_${i}_weight`)),
      actualReps: optInt.parse(formData.get(`${p}main_${i}_reps`)),
    }));
    const jokerCount = Math.min(Number(formData.get(`${p}jokerCount`) || 0), 10);
    for (let j = 0; j < jokerCount; j++) {
      const tw = optNum.parse(formData.get(`${p}joker_${j}_target`));
      const tr = optInt.parse(formData.get(`${p}joker_${j}_targetReps`));
      if (tw == null || tr == null) continue;
      setRows.push({
        workoutId,
        kind: "joker",
        setNumber: j + 1,
        targetWeight: tw,
        targetReps: tr,
        isAmrap: false,
        actualWeight: optNum.parse(formData.get(`${p}joker_${j}_weight`)),
        actualReps: optInt.parse(formData.get(`${p}joker_${j}_reps`)),
      });
    }

    const next = advance({
      trainingMax: ex.trainingMax,
      increment: ex.increment,
      cyclesPerBlock: ex.cyclesPerBlock,
      currentCycle: ex.currentCycle,
      currentWeek: ex.currentWeek as WeekNumber,
      blockNumber: ex.blockNumber,
    });
    statements.push(
      db.insert(workouts).values({
        id: workoutId,
        userId: user.id,
        exerciseId: ex.id,
        sessionId,
        performedOn,
        blockNumber: ex.blockNumber,
        cycle: ex.currentCycle,
        week: ex.currentWeek,
        trainingMax: ex.trainingMax,
        notes,
      }),
      db.insert(workoutSets).values(setRows),
      db
        .update(exercises)
        .set({
          trainingMax: next.trainingMax,
          currentCycle: next.currentCycle,
          currentWeek: next.currentWeek,
          blockNumber: next.blockNumber,
        })
        .where(and(eq(exercises.id, ex.id), eq(exercises.userId, user.id))),
    );
    logged++;
  }

  if (logged === 0) redirect("/dashboard");

  // The session row must come first: workouts reference it.
  await db.batch([
    db.insert(sessions).values({ id: sessionId, userId: user.id, templateId, name, performedOn }),
    ...statements,
  ] as unknown as Parameters<typeof db.batch>[0]);
  revalidatePath("/", "layout");
  redirect(`/calendar?month=${performedOn.slice(0, 7)}&date=${performedOn}`);
}

export async function saveTemplate(id: string | null, formData: FormData) {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(60).parse(formData.get("name"));
  const owned = new Set((await listExercises(user.id)).map((e) => e.id));
  const picked = [...owned]
    .filter((eid) => formData.get(`inc_${eid}`) === "on")
    .map((eid) => ({ eid, order: Number(formData.get(`ord_${eid}`)) || 999 }))
    .sort((a, b) => a.order - b.order);
  if (picked.length === 0) throw new Error("Pick at least one exercise");

  let templateId = id;
  if (templateId) {
    if (!(await getTemplate(user.id, templateId))) throw new Error("Template not found");
    await db.update(templates).set({ name }).where(and(eq(templates.id, templateId), eq(templates.userId, user.id)));
    await db.delete(templateExercises).where(eq(templateExercises.templateId, templateId));
  } else {
    const [row] = await db.insert(templates).values({ userId: user.id, name }).returning({ id: templates.id });
    templateId = row.id;
  }
  await db
    .insert(templateExercises)
    .values(picked.map((p, i) => ({ templateId: templateId!, exerciseId: p.eid, position: i })));
  revalidatePath("/", "layout");
  redirect("/templates");
}

export async function deleteTemplate(id: string) {
  const user = await requireUser();
  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, user.id)));
  revalidatePath("/", "layout");
  redirect("/templates");
}
