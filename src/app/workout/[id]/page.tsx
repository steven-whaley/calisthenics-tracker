import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { WorkoutForm } from "@/components/WorkoutForm";
import { completeSession } from "@/lib/actions";
import { getExercise, getWorkoutDraft } from "@/lib/data";
import { draftKeyFor } from "@/lib/draftKey";
import { toSessionExercise } from "@/lib/session";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      {async ({ userId, user: userP }) => {
        const [user, ex] = await Promise.all([userP, getExercise(userId, id)]);
        if (!ex || ex.archived) notFound();
        const sessionExercises = [toSessionExercise(ex, user.rounding, user.unit)];
        const initialDraft = await getWorkoutDraft(userId, draftKeyFor(sessionExercises));
        return (
          <>
            <h1 className="text-2xl font-bold">{ex.name}</h1>
            <WorkoutForm action={completeSession.bind(null, null)} exercises={sessionExercises} unit={user.unit} initialDraft={initialDraft} />
          </>
        );
      }}
    </AppShell>
  );
}
