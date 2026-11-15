import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ExerciseForm } from "@/components/ExerciseForm";
import { createExercise } from "@/lib/actions";
import { PROGRESSION_LABELS } from "@/lib/531";
import { getCatalogItem, listAvailableCatalog } from "@/lib/data";

export default async function NewExercise({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <AppShell>
      {async ({ userId, user: userP }) => {
        const [user, prefill, library] = await Promise.all([
          userP,
          from ? getCatalogItem(from) : Promise.resolve(null),
          listAvailableCatalog(userId),
        ]);
        return (
        <>
          <h1 className="text-2xl font-bold">{prefill ? `Set up ${prefill.name}` : "New exercise"}</h1>
          <p className="text-sm opacity-70">
            {prefill
              ? "The suggested progression and sets/reps are filled in and can be changed. Enter your training max to start."
              : "Enter a training max (usually 90% of your 1RM) or a 1RM and we\u2019ll derive it. The full progression is generated for you."}
          </p>
          <ExerciseForm key={prefill?.id ?? "new"} action={createExercise} prefill={prefill} unit={user.unit} submitLabel="Create & view progression" />
          {library.length > 0 && (
            <section className="card space-y-2">
              <h2 className="font-semibold">Start from the library</h2>
              <p className="text-sm opacity-70">Common exercises with a suggested progression. You still choose your own training max.</p>
              <ul className="flex flex-wrap gap-2">
                {library.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/exercises/new?from=${c.id}`}
                      className={`btn-ghost ${prefill?.id === c.id ? "border-orange-500" : ""}`}
                      title={PROGRESSION_LABELS[c.progression]}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
        );
      }}
    </AppShell>
  );
}
