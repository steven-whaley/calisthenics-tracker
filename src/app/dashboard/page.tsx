import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CycleProgress } from "@/components/CycleProgress";
import { PROGRESSION_LABELS, effectiveRounding, mainSets, schemeConfigOf, weekScheme, type ProgressionType, type WeekNumber } from "@/lib/531";
import { listExercises, listTemplates, listWorkoutDrafts, recentWorkouts } from "@/lib/data";
import { draftKeyFor } from "@/lib/draftKey";
import { fmt, fmtSetValue } from "@/lib/format";

export default function Dashboard() {
  return (
    <AppShell>
      {async (user) => {
        const [exs, recent, templates, drafts] = await Promise.all([
          listExercises(user.id),
          recentWorkouts(user.id),
          listTemplates(user.id),
          listWorkoutDrafts(user.id),
        ]);
        // Match each saved draft to the workout it belongs to (a template, or a single exercise).
        const keyOf = (list: typeof exs) => draftKeyFor(list.map((e) => ({ id: e.id, cycle: e.currentCycle, week: e.currentWeek })));
        const resumable = drafts.flatMap((d) => {
          const t = templates.find((t) => t.exercises.length > 0 && keyOf(t.exercises) === d.draftKey);
          if (t) return [{ ...d, name: t.name, href: `/session/${t.id}` }];
          const ex = exs.find((e) => keyOf([e]) === d.draftKey);
          return ex ? [{ ...d, name: ex.name, href: `/workout/${ex.id}` }] : [];
        });
        const ago = (d: Date) => {
          const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
          return mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} d ago`;
        };
        return (
          <>
            <h1 className="text-2xl font-bold">Today</h1>
            {resumable.map((r) => (
              <div
                key={r.draftKey}
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-500/60 bg-orange-500/10 px-4 py-3"
              >
                <p className="text-sm">
                  <span className="font-semibold">Workout in progress:</span> {r.name} · {r.setsLogged === 0 ? "no sets logged yet" : `${r.setsLogged} set${r.setsLogged === 1 ? "" : "s"} logged`} · saved {ago(r.updatedAt)}
                </p>
                <Link href={r.href} className="btn">Resume workout</Link>
              </div>
            ))}
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
                if (ex.progression === "reps") {
                  return (
                    <div key={ex.id} className="card space-y-2">
                      <h2 className="font-semibold">{ex.name}</h2>
                      <p className="text-sm opacity-80">
                        Bodyweight · {ex.setCount ?? 3} sets{ex.repTarget ? ` · goal ${ex.repTarget} reps` : ""}
                      </p>
                      {ex.nextProgression && <p className="text-xs opacity-70">Next progression: {ex.nextProgression}</p>}
                      <Link href={`/workout/${ex.id}`} className="btn">Start workout</Link>
                    </div>
                  );
                }
                const week = ex.currentWeek as WeekNumber;
                const cfg = schemeConfigOf(ex);
                const sets = mainSets(ex.trainingMax, week, effectiveRounding(user.rounding, ex.increment), cfg);
                return (
                  <div key={ex.id} className="card space-y-2">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-semibold">{ex.name}</h2>
                    </div>
                    <CycleProgress cycle={ex.currentCycle} week={week} cyclesPerBlock={ex.cyclesPerBlock} blockNumber={ex.blockNumber} />
                    <p className="text-sm opacity-80">
                      {PROGRESSION_LABELS[ex.progression as ProgressionType]} · {weekScheme(cfg, week).name}{ex.trainingMax === 0 ? "" : ` · ${ex.progression === "duration" ? "Weight" : "TM"} ${fmt(ex.trainingMax)} ${user.unit}`}
                    </p>
                    <p className="font-mono text-sm">
                      {sets.map((s) => `${fmtSetValue({ duration: ex.progression === "duration", weight: s.weight, amount: s.reps, unit: user.unit })}${s.amrap ? "+" : ""}`).join("  ")}
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
