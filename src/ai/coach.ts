import { ToolLoopAgent, isStepCount, tool } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { User } from "@/db/schema";
import { WEIGHTED_PROGRESSION_TYPES, effectiveRounding, estimate1RM, mainSets, projectBlock, roundWeight } from "@/lib/531";
import { listExercises } from "@/lib/data";
import { insertExercise } from "@/lib/exercises";
import { COACH_FALLBACK_MODELS, COACH_MODEL } from "./models";
import { COACH_PROMPT } from "./prompt";

export function createCoachAgent(user: User) {
  const instructions = `${COACH_PROMPT}

Notes on using your tools:
- The user trains in ${user.unit} and the app rounds weights to ${user.rounding} ${user.unit}, or to a finer step when an exercise increases by a smaller amount (increases can be as small as 0.5).
- Never do training-max arithmetic yourself; use calculateTrainingMax and projectProgression.
- Call listExercises before suggesting substitutions or additions so you don't duplicate what the user already has.
- Only call addExercise once the user has agreed on the name, training max and settings. The user will be asked to approve it. If it is denied, do not retry it; ask what to change.
- Progression types: 5/3/1 style (rep-out top set, jokers), pyramid (weight up, reps down), reverse pyramid (heaviest first), straight sets (fixed sets x reps; weight rises +increment each week only if target reps are hit on at least half the sets). Suggest the type that fits the movement and goal.
- Bodyweight-only exercises use the "just reps" style: no training max, weights or schedule. The user decides when to move on. For these, include a nextProgression (the next harder variation, e.g. Pike HSPU -> Elevated pike HSPU) when you add one.
- For weighted bodyweight movements (pull-ups, dips), the app's training max is the ADDED weight.
- Keep answers concise. You are not a medical professional; suggest easier regressions for pain or injury and recommend seeing a clinician for anything persistent.`;

  return new ToolLoopAgent({
    model: COACH_MODEL,
    instructions,
    stopWhen: isStepCount(6),
    // Reasoning tokens count toward this limit; too small a cap truncates replies to nothing.
    maxOutputTokens: 4000,
    reasoning: "low",
    providerOptions: {
      gateway: {
        // Gateway-level fallbacks, all zero-priced.
        models: COACH_FALLBACK_MODELS,
        user: user.id,
        tags: ["coach"],
      },
    },
    tools: {
      listExercises: tool({
        description: "List the user's current exercises with training max, progression settings and position in the cycle.",
        inputSchema: z.object({}),
        execute: async () => {
          const exs = await listExercises(user.id);
          return exs.map((e) => ({
            name: e.name,
            category: e.category,
            progression: e.progression,
            nextProgression: e.nextProgression ?? undefined,
            setsAndReps: e.progression === "straight_sets" ? `${e.setCount ?? 5}x${e.repTarget ?? 5}` : undefined,
            setsAndSeconds: e.progression === "duration" ? `${e.setCount ?? 3}x${e.repTarget ?? 30}s` : undefined,
            ...(e.progression === "reps"
              ? { plannedSets: e.setCount ?? 3, goalReps: e.repTarget ?? undefined }
              : {
                  trainingMax: e.trainingMax,
                  increment: e.increment,
                  cyclesPerBlock: e.cyclesPerBlock,
                  currentCycle: e.currentCycle,
                  currentWeek: e.currentWeek === 4 ? "deload" : e.currentWeek,
                  jokers: e.jokersEnabled,
                }),
          }));
        },
      }),
      calculateTrainingMax: tool({
        description:
          "Estimate a 1RM from a recent hard set (Epley) and derive the 5/3/1 training max. For bodyweight movements pass bodyweight and the added weight (0 for none).",
        inputSchema: z.object({
          addedWeight: z.number().min(0).max(2000).describe("Weight lifted (for bodyweight moves: the added weight, 0 if none)"),
          reps: z.number().int().min(1).max(30),
          bodyweight: z.number().min(0).max(1000).optional().describe("User's bodyweight, only for bodyweight movements"),
          tmPercent: z.number().min(80).max(95).default(90).describe("Training max as % of 1RM, usually 85-90"),
        }),
        execute: async ({ addedWeight, reps, bodyweight = 0, tmPercent }) => {
          const total = addedWeight + bodyweight;
          const oneRm = estimate1RM(total, reps);
          const tmTotal = roundWeight((oneRm * tmPercent) / 100, user.rounding);
          return {
            unit: user.unit,
            estimated1RMTotalLoad: oneRm,
            trainingMaxTotalLoad: tmTotal,
            // What to enter in the app for weighted bodyweight exercises.
            trainingMaxAddedWeight: Math.max(0, roundWeight(tmTotal - bodyweight, user.rounding)),
            tmPercent,
          };
        },
      }),
      projectProgression: tool({
        description: "Generate the 5/3/1 weights for every week of a block (cycles then deload) for a given training max.",
        inputSchema: z.object({
          trainingMax: z.number().min(1).max(2000),
          increment: z.number().min(0.5).max(100),
          cyclesPerBlock: z.number().int().min(1).max(12).default(2),
          progression: z.enum(WEIGHTED_PROGRESSION_TYPES).default("531"),
          setCount: z.number().int().min(1).max(10).optional().describe("Straight sets only"),
          repTarget: z.number().int().min(1).max(30).optional().describe("Straight sets only"),
        }),
        execute: async ({ trainingMax, increment, cyclesPerBlock, progression, setCount, repTarget }) => {
          if (progression === "straight_sets") {
            const cfg = { type: progression, setCount, repTarget } as const;
            const fmtSets = (w: 1 | 4) => mainSets(trainingMax, w, effectiveRounding(user.rounding, increment), cfg).map((s) => `${s.weight}x${s.reps}`);
            return {
              note: `Straight sets are performance-driven: the weight rises by ${increment} only after a week where the target reps are hit on at least 50% of sets.`,
              workingWeekSets: fmtSets(1),
              deloadSets: fmtSets(4),
            };
          }
          return projectBlock(trainingMax, increment, cyclesPerBlock, effectiveRounding(user.rounding, increment), { type: progression, setCount, repTarget }).map((c) => ({
            cycle: c.cycle,
            trainingMax: c.trainingMax,
            weeks: c.weeks.map((w) => ({
              week: w.week,
              name: w.name,
              sets: w.sets.map((s) => `${s.weight}x${s.reps}${s.amrap ? "+" : ""}`),
            })),
          }));
        },
      }),
      addExercise: tool({
        description: "Add a new exercise (with its generated progression) to the user's account. Requires user approval.",
        inputSchema: z.object({
          name: z.string().trim().min(1).max(60),
          category: z.enum(["upper", "lower", "other", "bodyweight"]).describe("Use bodyweight for exercises with no added weight; they become weightless straight sets (sets x reps) with no training max"),
          trainingMax: z.number().min(1).max(2000).optional().describe("Required for every category except bodyweight"),
          nextProgression: z.string().trim().max(60).optional().describe("Ignored; bodyweight exercises no longer track a next variation"),
          progression: z.enum(WEIGHTED_PROGRESSION_TYPES).optional().describe("Weighted only. Defaults to 5/3/1 style; others are pyramid, reverse_pyramid, straight_sets"),
          setCount: z.number().int().min(1).max(10).optional().describe("Straight sets only"),
          repTarget: z.number().int().min(1).max(30).optional().describe("Straight sets only"),
          increment: z.number().min(0.5).max(100).optional().describe("Per-cycle increase; omit for the default (+5/+10 lb)"),
          cyclesPerBlock: z.number().int().min(1).max(12).optional(),
          jokersEnabled: z.boolean().optional().describe("5/3/1 style only"),
        }),
        execute: async (input) => {
          const ex = await insertExercise(user, input);
          revalidatePath("/", "layout");
          return { added: true, id: ex.id, name: ex.name, progression: ex.progression, trainingMax: ex.trainingMax, increment: ex.increment, cyclesPerBlock: ex.cyclesPerBlock };
        },
      }),
    },
    toolApproval: { addExercise: "user-approval" },
  });
}

export type CoachAgent = ReturnType<typeof createCoachAgent>;
