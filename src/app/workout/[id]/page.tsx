import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { WorkoutForm } from "@/components/WorkoutForm";
import { completeSession } from "@/lib/actions";
import { getExercise } from "@/lib/data";
import { toSessionExercise } from "@/lib/session";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      {async (user) => {
        const ex = await getExercise(user.id, id);
        if (!ex || ex.archived) notFound();
        return (
          <>
            <h1 className="text-2xl font-bold">{ex.name}</h1>
            <WorkoutForm action={completeSession.bind(null, null)} exercises={[toSessionExercise(ex, user.rounding, user.unit)]} unit={user.unit} />
          </>
        );
      }}
    </AppShell>
  );
}
