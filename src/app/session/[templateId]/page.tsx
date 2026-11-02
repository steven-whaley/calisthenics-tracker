import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { WorkoutForm } from "@/components/WorkoutForm";
import { completeSession } from "@/lib/actions";
import { getTemplate } from "@/lib/data";
import { toSessionExercise } from "@/lib/session";

export default async function SessionPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  return (
    <AppShell>
      {async (user) => {
        const t = await getTemplate(user.id, templateId);
        if (!t) notFound();
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
                exercises={t.exercises.map((e) => toSessionExercise(e, user.rounding))}
                unit={user.unit}
              />
            )}
          </>
        );
      }}
    </AppShell>
  );
}
