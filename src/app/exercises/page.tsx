import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PROGRESSION_LABELS, type ProgressionType } from "@/lib/531";
import { unarchiveExercise } from "@/lib/actions";
import { listExercises } from "@/lib/data";
import { fmt, fmtSeconds } from "@/lib/format";

export default function Exercises() {
  return (
    <AppShell>
      {async ({ userId, user: userP }) => {
        const [user, all] = await Promise.all([userP, listExercises(userId, true)]);
        const exs = all.filter((e) => !e.archived);
        const archived = all.filter((e) => e.archived);
        return (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Exercises</h1>
              <Link href="/exercises/new" className="btn">Add exercise</Link>
            </div>
            <div className="grid gap-3">
              {exs.map((ex) => (
                <Link key={ex.id} href={`/exercises/${ex.id}`} className="card flex items-center justify-between hover:border-orange-500">
                  <span className="font-semibold">{ex.name}</span>
                  <span className="text-sm opacity-70">
                    {ex.progression === "reps" ? (
                      <>Bodyweight{ex.nextProgression ? ` · next: ${ex.nextProgression}` : ""}</>
                    ) : (
                      <>
                        {PROGRESSION_LABELS[ex.progression as ProgressionType]}
                        {ex.progression === "duration" ? ` · ${ex.setCount ?? 3}×${fmtSeconds(ex.repTarget ?? 30)}${ex.trainingMax > 0 ? ` · ${fmt(ex.trainingMax)} ${user.unit}` : ""}` : ex.trainingMax === 0 ? ` · ${ex.setCount ?? 5}×${ex.repTarget ?? 5} reps` : ` · TM ${fmt(ex.trainingMax)} ${user.unit} · +${fmt(ex.increment)}/${ex.progression === "straight_sets" ? "week" : "cycle"}`} · {ex.cyclesPerBlock} cycle{ex.cyclesPerBlock > 1 ? "s" : ""}/block
                        {ex.sessionsPerWeek > 1 ? ` · ${ex.sessionsPerWeek}×/week` : ""}{ex.jokersEnabled ? " · jokers" : ""}
                      </>
                    )}
                  </span>
                </Link>
              ))}
              {exs.length === 0 && <p className="opacity-70">Nothing here yet.</p>}
            </div>
            {archived.length > 0 && (
              <details className="card">
                <summary className="cursor-pointer font-semibold">Archived ({archived.length})</summary>
                <ul className="mt-3 space-y-2">
                  {archived.map((ex) => (
                    <li key={ex.id} className="flex items-center justify-between gap-2">
                      <span className="opacity-80">{ex.name}</span>
                      <form action={unarchiveExercise.bind(null, ex.id)}>
                        <button className="btn-ghost" aria-label={`Restore ${ex.name}`}>Restore</button>
                      </form>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs opacity-60">Restoring brings the exercise back with its history and current position.</p>
              </details>
            )}
          </>
        );
      }}
    </AppShell>
  );
}
