import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { archiveExercise, askCoachForNext, moveToNextProgression, updateBodyweightTargets, updateWeightedTargets } from "@/lib/actions";
import {
  DEFAULT_DURATION_SECONDS,
  DEFAULT_DURATION_SETS,
  DEFAULT_STRAIGHT_REPS,
  DEFAULT_STRAIGHT_SETS,
  PROGRESSION_LABELS,
  effectiveRounding,
  isStraightLike,
  mainSets,
  projectBlock,
  schemeConfigOf,
  type ProgressionType,
  type WeekNumber,
} from "@/lib/531";
import { getExercise, getHistory } from "@/lib/data";
import { fmt, fmtSeconds } from "@/lib/format";

export default async function ExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coach?: string; moved?: string; saved?: string }>;
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
              <p className="text-sm opacity-70">Bodyweight only · no set schedule, you decide when to progress</p>
              <form action={updateBodyweightTargets.bind(null, ex.id)} className="card space-y-3">
                <h2 className="font-semibold">Targets</h2>
                <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                  <div>
                    <label className="label" htmlFor="setCount">Target sets</label>
                    <input id="setCount" name="setCount" type="number" inputMode="numeric" min="1" max="10" required defaultValue={ex.setCount ?? 3} className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="repTarget">Target reps per set</label>
                    <input id="repTarget" name="repTarget" type="number" inputMode="numeric" min="1" max="30" placeholder="Optional" defaultValue={ex.repTarget ?? ""} className="input" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="btn">Save targets</button>
                  {sp.saved && <span className="text-sm text-green-600">Saved.</span>}
                </div>
              </form>
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
        const rounding = effectiveRounding(user.rounding, ex.increment);
        const straight = isStraightLike(ex.progression);
        const timed = ex.progression === "duration";
        const setText = (weight: number, n: number) => (timed ? `${weight > 0 ? `${fmt(weight)}${user.unit} · ` : ""}${fmtSeconds(n)}` : `${fmt(weight)}×${n}`);
        // Straight-set weights depend on performance, so there is no fixed plan to project.
        const plan = straight
          ? []
          : projectBlock(blockStartTm, ex.increment, ex.cyclesPerBlock, rounding, schemeConfigOf(ex));
        const maxSets = Math.max(0, ...plan.flatMap((c) => c.weeks.map((w) => w.sets.length)));
        const weekSets = (w: 1 | 4) => mainSets(ex.trainingMax, w, rounding, schemeConfigOf(ex));
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
              {straight ? (timed ? ` (${ex.setCount ?? DEFAULT_DURATION_SETS}×${fmtSeconds(ex.repTarget ?? DEFAULT_DURATION_SECONDS)})` : ` (${ex.setCount ?? DEFAULT_STRAIGHT_SETS}×${ex.repTarget ?? DEFAULT_STRAIGHT_REPS})`) : ""} · Block {ex.blockNumber}: {ex.cyclesPerBlock} cycle{ex.cyclesPerBlock > 1 ? "s" : ""} then deload · +{fmt(ex.increment)} {user.unit} per {straight ? "successful week" : "cycle"} ·
              you are at {ex.currentWeek === 4 ? "deload" : `cycle ${ex.currentCycle}, week ${ex.currentWeek}`}
            </p>
            <form action={updateWeightedTargets.bind(null, ex.id)} className="card space-y-3">
              <h2 className="font-semibold">Targets</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="trainingMax">{timed ? "Weight (0 = none)" : straight ? "Working weight" : "Training max"} ({user.unit})</label>
                  <input id="trainingMax" name="trainingMax" type="number" inputMode="decimal" step="any" min={timed ? "0" : "1"} required defaultValue={ex.trainingMax} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="increment">Increase per {straight ? "successful week" : "cycle"} ({user.unit})</label>
                  <input id="increment" name="increment" type="number" inputMode="decimal" step="any" min={timed ? "0" : "0.5"} required defaultValue={ex.increment} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="cyclesPerBlock">Cycles before deload</label>
                  <input id="cyclesPerBlock" name="cyclesPerBlock" type="number" inputMode="numeric" min="1" max="12" required defaultValue={ex.cyclesPerBlock} className="input" />
                </div>
                {straight && (
                  <>
                    <div>
                      <label className="label" htmlFor="setCount">Target sets</label>
                      <input id="setCount" name="setCount" type="number" inputMode="numeric" min="1" max="10" defaultValue={ex.setCount ?? (timed ? DEFAULT_DURATION_SETS : DEFAULT_STRAIGHT_SETS)} className="input" />
                    </div>
                    <div>
                      <label className="label" htmlFor="repTarget">{timed ? "Target seconds per set" : "Target reps per set"}</label>
                      <input id="repTarget" name="repTarget" type="number" inputMode="numeric" min="1" max={timed ? "3600" : "30"} defaultValue={ex.repTarget ?? (timed ? DEFAULT_DURATION_SECONDS : DEFAULT_STRAIGHT_REPS)} className="input" />
                    </div>
                    {timed && (
                      <div>
                        <label className="label" htmlFor="durationIncrement">Seconds added per successful week</label>
                        <input id="durationIncrement" name="durationIncrement" type="number" inputMode="numeric" min="0" max="600" placeholder="Optional" defaultValue={ex.durationIncrement ?? ""} className="input" />
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button className="btn">Save targets</button>
                {sp.saved && <span className="text-sm text-green-600">Saved.</span>}
              </div>
            </form>
            {straight && (
              <section className="card space-y-2">
                <h2 className="font-semibold">{timed ? (ex.trainingMax > 0 ? `Weight ${fmt(ex.trainingMax)} ${user.unit}` : "Bodyweight") : `Working weight ${fmt(ex.trainingMax)} ${user.unit}`}</h2>
                <p className="text-sm">
                  This week: <span className="font-mono">{weekSets(1).map((s) => setText(s.weight, s.reps)).join("  ")}</span>
                </p>
                <p className="text-sm opacity-80">
                  After each week, {timed ? "the weight and/or target time go up" : `the weight goes up ${fmt(ex.increment)} ${user.unit}`} only if you hit the target {timed ? "time" : "reps"} (at the target weight)
                  on at least half of your sets. Otherwise it stays put. Deload week:{" "}
                  <span className="font-mono">{weekSets(4).map((s) => setText(s.weight, s.reps)).join("  ")}</span>.
                </p>
              </section>
            )}
            {plan.map((c) => (
              <section key={String(c.cycle)} className="card overflow-x-auto">
                <h2 className="mb-2 font-semibold">
                  {c.cycle === "deload" ? "Deload" : `Cycle ${c.cycle}`} — TM {fmt(c.trainingMax)} {user.unit}
                </h2>
                <ul className="space-y-2 sm:hidden">
                  {c.weeks.map((w) => {
                    const current =
                      w.week === ex.currentWeek && (c.cycle === "deload" ? ex.currentWeek === 4 : c.cycle === ex.currentCycle);
                    return (
                      <li key={w.week} className={`rounded-lg p-2 ${current ? "bg-orange-500/10" : ""}`}>
                        <p className="text-sm font-medium">Week {w.week} · {w.name}{current ? " (you are here)" : ""}</p>
                        <p className="font-mono text-sm">
                          {w.sets.map((s) => `${fmt(s.weight)}×${s.reps}${s.amrap ? "+" : ""}`).join("   ")}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <table className="hidden w-full sm:table">
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
