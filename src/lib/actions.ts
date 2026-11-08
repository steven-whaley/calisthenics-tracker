"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { exercises, issueReports, sessions, templateExercises, templates, users, workoutDrafts, workouts, workoutSets, type Exercise, type User } from "@/db/schema";
import { WEIGHTED_PROGRESSION_TYPES, advance, effectiveRounding, evaluateStraightSets, mainSets, roundWeight, schemeConfigOf, type WeekNumber } from "@/lib/531";
import { suggestNextProgression } from "@/ai/suggest";
import { UserFacingError, insertExercise } from "@/lib/exercises";
import { toPickable } from "@/lib/pickable";
import { DRAFT_KEY_PATTERN } from "@/lib/draftKey";
import type { PickableExercise } from "@/components/TemplateForm";
import { getExercise, getTemplate, listExercises, requireUser } from "@/lib/data";

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);

const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);
const optSetCount = z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(10).optional());
const optRepTarget = z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(30).optional());

const weightedSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    category: z.enum(["upper", "lower", "other"]),
    progression: z.enum(WEIGHTED_PROGRESSION_TYPES).default("531"),
    setCount: optSetCount,
    repTarget: optRepTarget,
    increment: num(0.5, 100),
    cyclesPerBlock: z.coerce.number().int().min(1).max(12),
  })
  .transform((d) => ({
    ...d,
    // Sets x reps only applies to straight sets.
    setCount: d.progression === "straight_sets" ? (d.setCount ?? null) : null,
    repTarget: d.progression === "straight_sets" ? (d.repTarget ?? null) : null,
  }));

// Bodyweight-only: no weights, increment or cycles. Always "just reps".
const bodyweightSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.literal("bodyweight"),
  setCount: optSetCount,
  repTarget: optRepTarget,
  nextProgression: z.preprocess(blankToUndefined, z.string().trim().max(60).optional()),
});

async function createExerciseFromForm(user: User, formData: FormData): Promise<Exercise> {
  const raw = Object.fromEntries(formData);

  if (raw.category === "bodyweight") {
    const d = bodyweightSchema.parse(raw);
    return insertExercise(user, {
      name: d.name,
      category: "bodyweight",
      setCount: d.setCount,
      repTarget: d.repTarget,
      nextProgression: d.nextProgression,
    });
  }

  const base = weightedSchema.parse(raw);

  // Training max can be entered directly, or derived from a 1RM and a TM percentage.
  const tmRaw = formData.get("trainingMax");
  const oneRm = formData.get("oneRepMax");
  const pct = Number(formData.get("tmPercent") || 90) / 100;
  let tm = tmRaw ? Number(tmRaw) : oneRm ? Number(oneRm) * pct : NaN;
  if (!Number.isFinite(tm) || tm <= 0) throw new UserFacingError("Enter a training max or a 1RM");
  tm = roundWeight(tm, effectiveRounding(user.rounding, base.increment));

  const [row] = await db
    .insert(exercises)
    .values({
      userId: user.id,
      ...base,
      startingTm: tm,
      trainingMax: tm,
      // Joker sets are a 5/3/1 concept.
      jokersEnabled: base.progression === "531" && formData.get("jokersEnabled") === "on",
    })
    .returning();
  return row;
}

export async function createExercise(formData: FormData) {
  const user = await requireUser();
  const row = await createExerciseFromForm(user, formData);
  revalidatePath("/", "layout");
  redirect(`/exercises/${row.id}`);
}

/** Create an exercise without leaving the page (used from the template editor). */
export async function createExerciseInline(
  formData: FormData,
): Promise<{ ok: true; exercise: PickableExercise } | { ok: false; error: string }> {
  const user = await requireUser();
  try {
    const row = await createExerciseFromForm(user, formData);
    revalidatePath("/", "layout");
    return { ok: true, exercise: toPickable([row])[0] };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const issue = e.issues[0];
      return { ok: false, error: `${issue.path.join(".") || "Form"}: ${issue.message}` };
    }
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not create the exercise. Please try again." };
  }
}

export async function updateExercise(id: string, formData: FormData) {
  const user = await requireUser();
  const ex = await getExercise(user.id, id);
  if (!ex) throw new Error("Not found");
  const raw = Object.fromEntries(formData);

  if (ex.progression === "reps") {
    const d = bodyweightSchema.parse({ ...raw, category: "bodyweight" });
    await db
      .update(exercises)
      .set({
        name: d.name,
        setCount: d.setCount ?? 3,
        repTarget: d.repTarget ?? null,
        nextProgression: d.nextProgression ?? null,
      })
      .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  } else {
    const base = weightedSchema.parse(raw);
    const tm = num(1, 10000).parse(formData.get("trainingMax"));
    await db
      .update(exercises)
      .set({
        ...base,
        trainingMax: tm,
        jokersEnabled: base.progression === "531" && formData.get("jokersEnabled") === "on",
      })
      .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  }
  revalidatePath("/", "layout");
  redirect(`/exercises/${id}`);
}

/** Used by the exercise form: ask the coach model for the next harder variation of a bodyweight exercise. */
export async function suggestNextForName(name: string): Promise<{ suggestion: string | null; error?: string }> {
  const user = await requireUser();
  const parsed = z.string().trim().min(2).max(60).safeParse(name);
  if (!parsed.success) return { suggestion: null };
  try {
    return { suggestion: await suggestNextProgression(parsed.data, user.id) };
  } catch {
    return { suggestion: null, error: "The coach is unavailable right now. You can type the next progression yourself." };
  }
}

/** Ask the coach for (or refresh) the next progression of an existing bodyweight exercise. */
export async function askCoachForNext(id: string) {
  const user = await requireUser();
  const ex = await getExercise(user.id, id);
  if (!ex || ex.progression !== "reps") throw new Error("Not found");
  let status = "ok";
  try {
    const suggestion = await suggestNextProgression(ex.name, user.id);
    if (suggestion) {
      await db
        .update(exercises)
        .set({ nextProgression: suggestion })
        .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
    } else {
      status = "none";
    }
  } catch {
    status = "error";
  }
  revalidatePath("/", "layout");
  redirect(`/exercises/${id}?coach=${status}`);
}

/**
 * The user decides they've mastered a bodyweight exercise: switch to its next progression.
 * The old exercise is archived (its history stays) and swapped out of any templates.
 */
export async function moveToNextProgression(id: string) {
  const user = await requireUser();
  const ex = await getExercise(user.id, id);
  if (!ex || ex.progression !== "reps" || !ex.nextProgression) throw new Error("No next progression set");
  const newId = crypto.randomUUID();
  await db.batch([
    db.insert(exercises).values({
      id: newId,
      userId: user.id,
      name: ex.nextProgression,
      category: "bodyweight",
      progression: "reps",
      startingTm: 0,
      trainingMax: 0,
      increment: 0,
      setCount: ex.setCount,
      repTarget: ex.repTarget,
      cyclesPerBlock: ex.cyclesPerBlock,
    }),
    db.update(templateExercises).set({ exerciseId: newId }).where(eq(templateExercises.exerciseId, ex.id)),
    db.update(exercises).set({ archived: true }).where(and(eq(exercises.id, ex.id), eq(exercises.userId, user.id))),
  ]);
  revalidatePath("/", "layout");
  redirect(`/exercises/${newId}?moved=1`);
}

/** Update the targets of a weighted exercise (training max, increment, cycles, and sets x reps for straight sets). */
export async function updateWeightedTargets(id: string, formData: FormData) {
  const user = await requireUser();
  const ex = await getExercise(user.id, id);
  if (!ex || ex.progression === "reps") throw new Error("Not found");
  const d = z
    .object({
      trainingMax: num(1, 10000),
      increment: num(0.5, 100),
      cyclesPerBlock: z.coerce.number().int().min(1).max(12),
      setCount: optSetCount,
      repTarget: optRepTarget,
    })
    .parse(Object.fromEntries(formData));
  const straight = ex.progression === "straight_sets";
  await db
    .update(exercises)
    .set({
      trainingMax: d.trainingMax,
      increment: d.increment,
      cyclesPerBlock: d.cyclesPerBlock,
      ...(straight ? { setCount: d.setCount ?? null, repTarget: d.repTarget ?? null } : {}),
    })
    .where(and(eq(exercises.id, id), eq(exercises.userId, user.id)));
  revalidatePath("/", "layout");
  redirect(`/exercises/${id}?saved=1`);
}

/** Update the target sets and reps of a bodyweight exercise. */
export async function updateBodyweightTargets(id: string, formData: FormData) {
  const user = await requireUser();
  const d = z
    .object({ setCount: z.coerce.number().int().min(1).max(10), repTarget: optRepTarget })
    .parse(Object.fromEntries(formData));
  await db
    .update(exercises)
    .set({ setCount: d.setCount, repTarget: d.repTarget ?? null })
    .where(and(eq(exercises.id, id), eq(exercises.userId, user.id), eq(exercises.progression, "reps")));
  revalidatePath("/", "layout");
  redirect(`/exercises/${id}?saved=1`);
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
  // Total workout time from the in-form timer (optional; capped at 24h).
  const durationParsed = z.coerce.number().int().min(1).max(86400).safeParse(formData.get("durationSeconds"));
  const durationSeconds = durationParsed.success ? durationParsed.data : null;

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

    if (ex.progression === "reps") {
      // Bodyweight only: just record the reps per set. No targets, weights or progression state.
      const n = Math.min(Math.max(Math.trunc(Number(formData.get(`${p}setCount`)) || 0), 1), 20);
      const goalParsed = optRepTarget.safeParse(formData.get(`${p}goalReps`));
      const goal = goalParsed.success ? goalParsed.data ?? null : (ex.repTarget ?? null);
      const repsWorkoutId = crypto.randomUUID();
      statements.push(
        db.insert(workouts).values({
          id: repsWorkoutId,
          userId: user.id,
          exerciseId: ex.id,
          sessionId,
          performedOn,
          blockNumber: ex.blockNumber,
          cycle: ex.currentCycle,
          week: ex.currentWeek,
          trainingMax: 0,
          notes,
        }),
        db.insert(workoutSets).values(
          Array.from({ length: n }, (_, i) => ({
            workoutId: repsWorkoutId,
            kind: "main" as const,
            setNumber: i + 1,
            targetWeight: 0,
            targetReps: goal ?? 0,
            isAmrap: false,
            actualWeight: null,
            actualReps: optInt.parse(formData.get(`${p}main_${i}_reps`)),
          })),
        ),
      );
      // Edited targets become the exercise's new defaults.
      if (n !== (ex.setCount ?? 3) || goal !== (ex.repTarget ?? null)) {
        statements.push(
          db.update(exercises).set({ setCount: n, repTarget: goal }).where(and(eq(exercises.id, ex.id), eq(exercises.userId, user.id))),
        );
      }
      logged++;
      continue;
    }

    const workoutId = crypto.randomUUID();
    const targets = mainSets(ex.trainingMax, ex.currentWeek as WeekNumber, effectiveRounding(user.rounding, ex.increment), schemeConfigOf(ex));
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

    const straight = ex.progression === "straight_sets";
    const next = advance(
      {
        trainingMax: ex.trainingMax,
        increment: ex.increment,
        cyclesPerBlock: ex.cyclesPerBlock,
        currentCycle: ex.currentCycle,
        currentWeek: ex.currentWeek as WeekNumber,
        blockNumber: ex.blockNumber,
      },
      // Straight sets are performance-driven: no automatic per-cycle bump.
      { bumpAtCycleEnd: !straight },
    );
    if (straight && ex.currentWeek !== 4) {
      const mainRows = setRows.filter((r) => r.kind === "main");
      if (evaluateStraightSets(mainRows).passed) next.trainingMax = ex.trainingMax + ex.increment;
    }
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

  // The workout is done, so its saved in-progress draft goes with it.
  const draftKeyField = String(formData.get("draftKey") ?? "");
  if (DRAFT_KEY_PATTERN.test(draftKeyField)) {
    statements.push(db.delete(workoutDrafts).where(and(eq(workoutDrafts.userId, user.id), eq(workoutDrafts.draftKey, draftKeyField))));
  }

  // The session row must come first: workouts reference it.
  await db.batch([
    db.insert(sessions).values({ id: sessionId, userId: user.id, templateId, name, performedOn, durationSeconds }),
    ...statements,
  ] as unknown as Parameters<typeof db.batch>[0]);
  revalidatePath("/", "layout");
  redirect(`/calendar?month=${performedOn.slice(0, 7)}&date=${performedOn}&saved=1#day-detail`);
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

const ISSUES_PER_DAY = 5;

const issueSchema = z.object({
  kind: z.enum(["bug", "feature", "other"]),
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(100, "Title is too long (100 max)"),
  details: z.string().trim().min(10, "Please add a few more details").max(2000, "Details are too long (2000 max)"),
});

/** Stop user text from @-mentioning (and so notifying) real GitHub accounts. */
const defuseMentions = (t: string) => t.replace(/@(?=[A-Za-z0-9])/g, "@\u200b");

const KIND_LABELS = { bug: "Bug", feature: "Feature request", other: "Other" } as const;
const KIND_GH_LABELS = { bug: ["bug"], feature: ["enhancement"], other: [] } as const;

/** Create a GitHub issue from the in-app form and remember it for the user. */
export async function submitIssue(formData: FormData): Promise<{ ok: true; number: number } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = issueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { kind, title, details } = parsed.data;

  const token = process.env.GITHUB_ISSUES_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "steven-whaley/calisthenics-tracker";
  if (!token) return { ok: false, error: "Issue reporting isn't set up yet. Please try again later." };

  // Per-user daily cap so the form can't be used to flood the repository.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(issueReports)
    .where(and(eq(issueReports.userId, user.id), gte(issueReports.createdAt, since)));
  if (n >= ISSUES_PER_DAY) return { ok: false, error: `You can submit up to ${ISSUES_PER_DAY} issues per day. Please try again tomorrow.` };

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "531-tracker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: defuseMentions(`[${KIND_LABELS[kind]}] ${title}`),
        // No email or name is sent: only a short, non-reversible-to-identity user reference.
        body: `${defuseMentions(details)}\n\n---\n_Submitted via the in-app issue form (user \`${user.id.slice(0, 8)}\`)._`,
        labels: ["user-reported", ...KIND_GH_LABELS[kind]],
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, error: "Couldn't reach GitHub. Please try again." };
  }
  if (!res.ok) {
    console.error("GitHub issue creation failed", res.status);
    return { ok: false, error: "Couldn't create the issue right now. Please try again later." };
  }
  const issue = (await res.json()) as { number: number; html_url: string };

  await db.insert(issueReports).values({
    userId: user.id,
    kind,
    title,
    githubNumber: issue.number,
    githubUrl: issue.html_url,
  });
  revalidatePath("/issues");
  return { ok: true, number: issue.number };
}

const draftFieldsSchema = z.record(z.string().max(100), z.string().max(2000)).refine((o) => Object.keys(o).length <= 400, "Too many fields");

/** Save (upsert) the in-progress workout so it survives navigating away or switching devices. */
export async function saveWorkoutDraft(key: string, fields: Record<string, string>): Promise<void> {
  const user = await requireUser();
  if (!DRAFT_KEY_PATTERN.test(key)) throw new Error("Invalid draft key");
  const data = JSON.stringify(draftFieldsSchema.parse(fields));
  if (data.length > 60000) throw new Error("Draft too large");
  await db
    .insert(workoutDrafts)
    .values({ userId: user.id, draftKey: key, data })
    .onConflictDoUpdate({ target: [workoutDrafts.userId, workoutDrafts.draftKey], set: { data, updatedAt: new Date() } });
}

/** Remove an in-progress workout (used when the user discards it). */
export async function clearWorkoutDraft(key: string): Promise<void> {
  const user = await requireUser();
  if (!DRAFT_KEY_PATTERN.test(key)) return;
  await db.delete(workoutDrafts).where(and(eq(workoutDrafts.userId, user.id), eq(workoutDrafts.draftKey, key)));
}
