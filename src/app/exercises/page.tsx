import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PROGRESSION_LABELS, type ProgressionType } from "@/lib/531";
import { listExercises } from "@/lib/data";
import { fmt, fmtSeconds } from "@/lib/format";

export default function Exercises() {
  return (
    <AppShell>
      {async (user) => {
        const exs = await listExercises(user.id);
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
                        {ex.progression === "duration" ? ` · ${ex.setCount ?? 3}×${fmtSeconds(ex.repTarget ?? 30)}${ex.trainingMax > 0 ? ` · ${fmt(ex.trainingMax)} ${user.unit}` : ""}` : ` · TM ${fmt(ex.trainingMax)} ${user.unit} · +${fmt(ex.increment)}/${ex.progression === "straight_sets" ? "week" : "cycle"}`} · {ex.cyclesPerBlock} cycle{ex.cyclesPerBlock > 1 ? "s" : ""}/block
                        {ex.jokersEnabled ? " · jokers" : ""}
                      </>
                    )}
                  </span>
                </Link>
              ))}
              {exs.length === 0 && <p className="opacity-70">Nothing here yet.</p>}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
