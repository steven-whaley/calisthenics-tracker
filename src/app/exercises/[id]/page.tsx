import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { archiveExercise, askCoachForNext, moveToNextProgression } from "@/lib/actions";
import {
  DEFAULT_STRAIGHT_REPS,
  DEFAULT_STRAIGHT_SETS,
  PROGRESSION_LABELS,
  mainSets,
  projectBlock,
  schemeConfigOf,
  type ProgressionType,
  type WeekNumber,
} from "@/lib/531";
import { getExercise, getHistory } from "@/lib/data";
import { fmt } from "@/lib/format";

export default async function ExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coach?: string; moved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <AppShell>
      {async (user) => {
        const ex = await getExercise(user.id, id);
        if (!ex || ex.archived) notFound();

        if (ex.progression === "reps") {
          const history = (await getHistory(user.id, ex.id)).slice(-8).reverse();
          return (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">{ex.name}</h1>
                <div className="flex gap-2">
                  <Link href={`/workout/${ex.id}`} className="btn">Start workout</Link>
                  <Link href={`/exercises/${ex.id}/edit`} className="btn-ghost">Edit</Link>
                </div>
              </div>
              <p className="text-sm opacity-70">
                Bodyweight only · {ex.setCount ?? 3} sets{ex.repTarget ? ` · goal ${ex.repTarget} reps per set` : ""} · no set schedule, you decide when to progress
              </p>
              {sp.moved && <p className="text-sm text-green-600">Moved on. Your previous variation is archived with its history.</p>}
              <section className="card space-y-3">
                <h2 className="font-semibold">Next progression</h2>
                {ex.nextProgression ? (
                  <>
                    <p className="text-lg">{ex.nextProgression}</p>
                    <div className="flex flex-wrap gap-2">
                      <form action={moveToNextProgression.bind(null, ex.id)}>
                        <button className="btn">I&apos;m ready: move on to {ex.nextProgression}</button>
                      </form>
                      <form action={askCoachForNext.bind(null, ex.id)}>
                        <button className="btn-ghost">Ask coach again</button>
                      </form>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm opacity-70">No next progression set yet.</p>
                    <form action={askCoachForNext.bind(null, ex.id)}>
                      <button className="btn">Ask coach to suggest one</button>
                    </form>
                  </>
                )}
                {sp.coach === "error" && <p className="text-xs text-red-600">The coach is unavailable right now. You can set one manually via Edit.</p>}
                {sp.coach === "none" && <p className="text-xs opacity-70">The coach had no suggestion. This may be the hardest variation.</p>}
              </section>
              {history.length > 0 && (
                <section className="card space-y-1">
                  <h2 className="font-semibold">Recent sessions</h2>
                  {history.map((w) => (
                    <p key={w.id} className="font-mono text-sm">
                      {w.completedAt.toLocaleDateString("en-US")} — {w.sets.map((s) => s.actualReps ?? "–").join(" / ")}
                    </p>
                  ))}
                </section>
              )}
              <form action={archiveExercise.bind(null, ex.id)}>
                <button className="btn-ghost text-red-600">Archive exercise</button>
              </form>
            </>
          );
        }

        // Project from the TM at the start of the current block so progress is visible in context.
        const blockStartTm =
          ex.currentWeek === 4
            ? ex.trainingMax - ex.cyclesPerBlock * ex.increment
            : ex.trainingMax - (ex.currentCycle - 1) * ex.increment;
        const straight = ex.progression === "straight_sets";
        // Straight-set weights depend on performance, so there is no fixed plan to project.
        const plan = straight
          ? []
          : projectBlock(blockStartTm, ex.increment, ex.cyclesPerBlock, user.rounding, schemeConfigOf(ex));
        const maxSets = Math.max(0, ...plan.flatMap((c) => c.weeks.map((w) => w.sets.length)));
        const weekSets = (w: 1 | 4) => mainSets(ex.trainingMax, w, user.rounding, schemeConfigOf(ex));
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold">{ex.name}</h1>
              <div className="flex gap-2">
                <Link href={`/workout/${ex.id}`} className="btn">Start workout</Link>
                <Link href={`/exercises/${ex.id}/edit`} className="btn-ghost">Edit</Link>
              </div>
            </div>
            <p className="text-sm opacity-70">
              {PROGRESSION_LABELS[ex.progression as ProgressionType]}
              {ex.progression === "straight_sets" ? ` (${ex.setCount ?? DEFAULT_STRAIGHT_SETS}×${ex.repTarget ?? DEFAULT_STRAIGHT_REPS})` : ""} · Block {ex.blockNumber}: {ex.cyclesPerBlock} cycle{ex.cyclesPerBlock > 1 ? "s" : ""} then deload · +{fmt(ex.increment)} {user.unit} per {straight ? "successful week" : "cycle"} ·
              you are at {ex.currentWeek === 4 ? "deload" : `cycle ${ex.currentCycle}, week ${ex.currentWeek}`}
            </p>
            {straight && (
              <section className="card space-y-2">
                <h2 className="font-semibold">Working weight {fmt(ex.trainingMax)} {user.unit}</h2>
                <p className="text-sm">
                  This week: <span className="font-mono">{weekSets(1).map((s) => `${fmt(s.weight)}×${s.reps}`).join("  ")}</span>
                </p>
                <p className="text-sm opacity-80">
                  After each week, the weight goes up {fmt(ex.increment)} {user.unit} only if you hit the target reps (at the target weight)
                  on at least half of your sets. Otherwise it stays put. Deload week:{" "}
                  <span className="font-mono">{weekSets(4).map((s) => `${fmt(s.weight)}×${s.reps}`).join("  ")}</span>.
                </p>
              </section>
            )}
            {plan.map((c) => (
              <section key={String(c.cycle)} className="card overflow-x-auto">
                <h2 className="mb-2 font-semibold">
                  {c.cycle === "deload" ? "Deload" : `Cycle ${c.cycle}`} — TM {fmt(c.trainingMax)} {user.unit}
                </h2>
                <table className="w-full">
                  <thead>
                    <tr><th className="th">Week</th>{Array.from({ length: maxSets }, (_, i) => <th key={i} className="th">Set {i + 1}</th>)}</tr>
                  </thead>
                  <tbody>
                    {c.weeks.map((w) => {
                      const current =
                        w.week === ex.currentWeek && (c.cycle === "deload" ? ex.currentWeek === 4 : c.cycle === ex.currentCycle);
                      return (
                        <tr key={w.week} className={current ? "bg-orange-500/10" : ""}>
                          <td className="td">{w.week as WeekNumber} · {w.name}</td>
                          {w.sets.map((s) => (
                            <td key={s.setNumber} className="td font-mono">
                              {fmt(s.weight)}×{s.reps}{s.amrap ? "+" : ""} <span className="opacity-50">({Math.round(s.pct * 100)}%)</span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}
            <form action={archiveExercise.bind(null, ex.id)}>
              <button className="btn-ghost text-red-600">Archive exercise</button>
              <span className="ml-2 text-xs opacity-60">History is kept; it just disappears from your lists.</span>
            </form>
          </>
        );
      }}
    </AppShell>
  );
}
