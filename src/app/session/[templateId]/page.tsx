import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { WorkoutForm } from "@/components/WorkoutForm";
import { completeSession } from "@/lib/actions";
import { getTemplate, getWorkoutDraft } from "@/lib/data";
import { draftKeyFor } from "@/lib/draftKey";
import { toSessionExercise } from "@/lib/session";

export default async function SessionPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  return (
    <AppShell>
      {async ({ userId, user: userP }) => {
        const [user, t] = await Promise.all([userP, getTemplate(userId, templateId)]);
        if (!t) notFound();
        const sessionExercises = t.exercises.map((e) => toSessionExercise(e, user.rounding, user.unit));
        const initialDraft = sessionExercises.length ? await getWorkoutDraft(userId, draftKeyFor(sessionExercises)) : null;
        return (
          <>
            <div>
              <h1 className="text-2xl font-bold">{t.name}</h1>
              <p className="text-sm opacity-70">
                Today&apos;s lifts at their current place in each cycle. Untick any you&apos;re skipping — they stay where they are.
              </p>
            </div>
            {t.exercises.length === 0 ? (
              <p>This template has no active exercises.</p>
            ) : (
              <WorkoutForm
                action={completeSession.bind(null, t.id)}
                exercises={sessionExercises}
                unit={user.unit}
                initialDraft={initialDraft}
              />
            )}
          </>
        );
      }}
    </AppShell>
  );
}
