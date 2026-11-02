import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { archiveExercise } from "@/lib/actions";
import { projectBlock, type WeekNumber } from "@/lib/531";
import { getExercise } from "@/lib/data";
import { fmt } from "@/lib/format";

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      {async (user) => {
        const ex = await getExercise(user.id, id);
        if (!ex || ex.archived) notFound();
        // Project from the TM at the start of the current block so progress is visible in context.
        const blockStartTm =
          ex.currentWeek === 4
            ? ex.trainingMax - ex.cyclesPerBlock * ex.increment
            : ex.trainingMax - (ex.currentCycle - 1) * ex.increment;
        const plan = projectBlock(blockStartTm, ex.increment, ex.cyclesPerBlock, user.rounding);
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
              Block {ex.blockNumber}: {ex.cyclesPerBlock} cycle{ex.cyclesPerBlock > 1 ? "s" : ""} then deload · +{fmt(ex.increment)} {user.unit} per cycle ·
              you are at {ex.currentWeek === 4 ? "deload" : `cycle ${ex.currentCycle}, week ${ex.currentWeek}`}
            </p>
            {plan.map((c) => (
              <section key={String(c.cycle)} className="card overflow-x-auto">
                <h2 className="mb-2 font-semibold">
                  {c.cycle === "deload" ? "Deload" : `Cycle ${c.cycle}`} — TM {fmt(c.trainingMax)} {user.unit}
                </h2>
                <table className="w-full">
                  <thead>
                    <tr><th className="th">Week</th><th className="th">Set 1</th><th className="th">Set 2</th><th className="th">Set 3</th></tr>
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
