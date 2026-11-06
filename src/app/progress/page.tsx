import { AppShell } from "@/components/AppShell";
import { ProgressChart } from "@/components/ProgressChart";
import { PROGRESSION_LABELS, estimate1RM, type ProgressionType } from "@/lib/531";
import { getHistory, listExercises } from "@/lib/data";
import { fmt } from "@/lib/format";

function result(target: { w: number; r: number }, actual: { w: number | null; r: number | null }) {
  if (actual.r == null) return "text-stone-500";
  const w = actual.w ?? target.w;
  return w >= target.w && actual.r >= target.r ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

export default function Progress() {
  return (
    <AppShell>
      {async (user) => {
        const exs = await listExercises(user.id, true);
        const histories = await Promise.all(exs.map((e) => getHistory(user.id, e.id)));
        const active = exs.map((e, i) => ({ e, h: histories[i] })).filter(({ e, h }) => !e.archived || h.length > 0);
        return (
          <>
            <h1 className="text-2xl font-bold">Progress: target vs. actual</h1>
            {active.length === 0 && <p className="opacity-70">Complete a workout to see your history here.</p>}
            {active.map(({ e, h }) => {
              const points = h.map((w) => {
                const mains = w.sets.filter((s) => s.kind === "main");
                // 5/3/1 has an AMRAP top set; other schemes use their heaviest target set.
                const top =
                  mains.find((s) => s.isAmrap) ??
                  mains.reduce<(typeof mains)[number] | undefined>((a, b) => (!a || b.targetWeight > a.targetWeight ? b : a), undefined);
                const ok = top && top.actualReps != null;
                return { tm: w.trainingMax, e1rm: ok ? estimate1RM(top.actualWeight ?? top.targetWeight, top.actualReps!) : null };
              });
              const maxSets = Math.max(0, ...h.map((w) => w.sets.filter((s) => s.kind === "main").length));
              const hasJokers = h.some((w) => w.sets.some((s) => s.kind === "joker"));
              return (
                <section key={e.id} className="card space-y-3">
                  <h2 className="font-semibold">
                    {e.name}{e.archived ? " (archived)" : ""}{" "}
                    <span className="text-xs font-normal opacity-60">{PROGRESSION_LABELS[e.progression as ProgressionType]}</span>
                  </h2>
                  {h.length === 0 && <p className="text-sm opacity-70">No workouts logged yet.</p>}
                  <ProgressChart points={points} unit={user.unit} />
                  {h.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="th">Date</th><th className="th">B/C/W</th><th className="th">TM</th>
                            {Array.from({ length: maxSets }, (_, i) => <th key={i} className="th">Set {i + 1}</th>)}
                            {hasJokers && <th className="th">Jokers</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {[...h].reverse().map((w) => (
                            <tr key={w.id} className="border-t border-stone-300/40 dark:border-stone-800">
                              <td className="td">{w.completedAt.toLocaleDateString("en-US")}</td>
                              <td className="td">{w.blockNumber}/{w.cycle}/{w.week === 4 ? "D" : w.week}</td>
                              <td className="td">{fmt(w.trainingMax)}</td>
                              {w.sets.filter((s) => s.kind === "main").map((s) => (
                                <td key={s.id} className={`td font-mono ${result({ w: s.targetWeight, r: s.targetReps }, { w: s.actualWeight, r: s.actualReps })}`}>
                                  <div className="opacity-60">{fmt(s.targetWeight)}×{s.targetReps}{s.isAmrap ? "+" : ""}</div>
                                  <div>{fmt(s.actualWeight)}×{s.actualReps ?? "–"}</div>
                                </td>
                              ))}
                              {Array.from({ length: maxSets - w.sets.filter((s) => s.kind === "main").length }, (_, i) => <td key={`pad${i}`} className="td" />)}
                              {hasJokers && (
                                <td className="td font-mono">
                                  {w.sets.filter((s) => s.kind === "joker").map((s) => (
                                    <div key={s.id} className={result({ w: s.targetWeight, r: s.targetReps }, { w: s.actualWeight, r: s.actualReps })}>
                                      {fmt(s.actualWeight)}×{s.actualReps ?? "–"}
                                    </div>
                                  ))}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </>
        );
      }}
    </AppShell>
  );
}
