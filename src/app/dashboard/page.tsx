import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CycleProgress } from "@/components/CycleProgress";
import { WEEK_SCHEMES, mainSets, type WeekNumber } from "@/lib/531";
import { listExercises, listTemplates, recentWorkouts } from "@/lib/data";
import { fmt } from "@/lib/format";

export default function Dashboard() {
  return (
    <AppShell>
      {async (user) => {
        const [exs, recent, templates] = await Promise.all([
          listExercises(user.id),
          recentWorkouts(user.id),
          listTemplates(user.id),
        ]);
        return (
          <>
            <h1 className="text-2xl font-bold">Today</h1>
            {exs.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Start from a template</h2>
                  <Link href="/templates/new" className="text-sm underline">New template</Link>
                </div>
                {templates.length === 0 && <p className="text-sm opacity-70">No templates yet — group exercises into a workout day.</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((t) => (
                    <Link key={t.id} href={`/session/${t.id}`} className="card hover:border-orange-500">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm opacity-70">{t.exercises.map((e) => e.name).join(" · ") || "No exercises"}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {exs.length === 0 && (
              <div className="card">
                <p className="mb-3">No exercises yet. Add your first lift to generate its progression.</p>
                <Link href="/exercises/new" className="btn">Add exercise</Link>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {exs.map((ex) => {
                const week = ex.currentWeek as WeekNumber;
                const sets = mainSets(ex.trainingMax, week, user.rounding);
                return (
                  <div key={ex.id} className="card space-y-2">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-semibold">{ex.name}</h2>
                    </div>
                    <CycleProgress cycle={ex.currentCycle} week={week} cyclesPerBlock={ex.cyclesPerBlock} blockNumber={ex.blockNumber} />
                    <p className="text-sm opacity-80">
                      {WEEK_SCHEMES[week].name} · TM {fmt(ex.trainingMax)} {user.unit}
                    </p>
                    <p className="font-mono text-sm">
                      {sets.map((s) => `${fmt(s.weight)}×${s.reps}${s.amrap ? "+" : ""}`).join("  ")}
                    </p>
                    <Link href={`/workout/${ex.id}`} className="btn">Start workout</Link>
                  </div>
                );
              })}
            </div>
            {recent.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold">Recent</h2>
                <ul className="space-y-1 text-sm opacity-80">
                  {recent.map((r) => (
                    <li key={r.id}>
                      {r.completedAt.toLocaleDateString("en-US")} — {r.exerciseName}, cycle {r.cycle} week {r.week}
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
