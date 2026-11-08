import { AppShell } from "@/components/AppShell";
import { ProgressChart } from "@/components/ProgressChart";
import { PROGRESSION_LABELS, estimate1RM, type ProgressionType } from "@/lib/531";
import { getHistory, listExercises } from "@/lib/data";
import { fmt, fmtClock, fmtSetValue } from "@/lib/format";

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
              if (e.progression === "reps") {
                return (
                  <section key={e.id} className="card space-y-3">
                    <h2 className="font-semibold">
                      {e.name}{e.archived ? " (archived)" : ""}{" "}
                      <span className="text-xs font-normal opacity-60">Bodyweight</span>
                    </h2>
                    {h.length === 0 && <p className="text-sm opacity-70">No workouts logged yet.</p>}
                    {h.length > 0 && (
                      <table className="w-full">
                        <thead>
                          <tr><th className="th">Date</th><th className="th">Reps per set</th><th className="th">Total</th><th className="th">Rest</th></tr>
                        </thead>
                        <tbody>
                          {[...h].reverse().map((w) => (
                            <tr key={w.id} className="border-t border-stone-300/40 dark:border-stone-800">
                              <td className="td">{w.completedAt.toLocaleDateString("en-US")}</td>
                              <td className="td font-mono">{w.sets.map((s) => s.actualReps ?? "–").join(" / ")}</td>
                              <td className="td">{w.sets.reduce((t, s) => t + (s.actualReps ?? 0), 0)}</td>
                              <td className="td font-mono">{w.sets.some((s) => s.restSeconds != null) ? w.sets.map((s) => (s.restSeconds != null ? fmtClock(s.restSeconds) : "–")).join(" / ") : "–"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                );
              }
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
                    <ul className="space-y-3 sm:hidden">
                      {[...h].reverse().map((w) => (
                        <li key={w.id} className="rounded-lg border border-stone-300/60 p-3 dark:border-stone-800">
                          <p className="mb-2 flex flex-wrap justify-between gap-x-3 text-sm">
                            <span className="font-medium">{w.completedAt.toLocaleDateString("en-US")}</span>
                            <span className="opacity-70">
                              {w.blockNumber}/{w.cycle}/{w.week === 4 ? "D" : w.week} · TM {fmt(w.trainingMax)}
                            </span>
                          </p>
                          <div className="space-y-1 font-mono text-sm">
                            {w.sets.map((s) => (
                              <p key={s.id} className={result({ w: s.targetWeight, r: s.targetReps }, { w: s.actualWeight, r: s.actualReps })}>
                                {s.kind === "joker" ? `J${s.setNumber}` : `Set ${s.setNumber}`}: {fmtSetValue({ duration: e.progression === "duration", weight: s.actualWeight ?? s.targetWeight, amount: s.actualReps ?? "–", unit: user.unit })}
                                <span className="opacity-50"> / {fmtSetValue({ duration: e.progression === "duration", weight: s.targetWeight, amount: s.targetReps, unit: user.unit })}{s.isAmrap ? "+" : ""}</span>
                                {s.restSeconds != null && <span className="opacity-60"> ⏱{fmtClock(s.restSeconds)}</span>}
                              </p>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {h.length > 0 && (
                    <div className="hidden overflow-x-auto sm:block">
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
                                  <div className="opacity-60">{fmtSetValue({ duration: e.progression === "duration", weight: s.targetWeight, amount: s.targetReps, unit: user.unit })}{s.isAmrap ? "+" : ""}</div>
                                  <div>{fmtSetValue({ duration: e.progression === "duration", weight: s.actualWeight ?? s.targetWeight, amount: s.actualReps ?? "–", unit: user.unit })}</div>
                                  {s.restSeconds != null && <div className="text-xs opacity-60">⏱{fmtClock(s.restSeconds)}</div>}
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
