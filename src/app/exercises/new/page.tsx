import { AppShell } from "@/components/AppShell";
import { ExerciseForm } from "@/components/ExerciseForm";
import { createExercise } from "@/lib/actions";

export default function NewExercise() {
  return (
    <AppShell>
      {(user) => (
        <>
          <h1 className="text-2xl font-bold">New exercise</h1>
          <p className="text-sm opacity-70">
            Enter a training max (usually 90% of your 1RM) or a 1RM and we&apos;ll derive it. The full progression is generated for you.
          </p>
          <ExerciseForm action={createExercise} unit={user.unit} submitLabel="Create & view progression" />
        </>
      )}
    </AppShell>
  );
}
