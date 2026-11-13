import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExerciseForm } from "@/components/ExerciseForm";
import { updateExercise } from "@/lib/actions";
import { getExercise } from "@/lib/data";

export default async function EditExercise({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      {async ({ userId, user: userP }) => {
        const [user, ex] = await Promise.all([userP, getExercise(userId, id)]);
        if (!ex || ex.archived) notFound();
        return (
          <>
            <h1 className="text-2xl font-bold">Edit {ex.name}</h1>
            <ExerciseForm action={updateExercise.bind(null, ex.id)} exercise={ex} unit={user.unit} submitLabel="Save" />
          </>
        );
      }}
    </AppShell>
  );
}
