import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClearWorkoutDrafts } from "@/components/ClearWorkoutDrafts";
import { CycleProgress } from "@/components/CycleProgress";
import { getWorkoutsInRange, listExercises } from "@/lib/data";
import { evaluateStraightSets, isStraightLike } from "@/lib/531";
import { fmt, fmtClock, fmtDuration, fmtSetValue } from "@/lib/format";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AppShell>
      {async (user) => {
        // A workout was just saved: forget any unfinished-workout drafts on this device.
        const justSaved = sp.saved === "1";
        const now = new Date();
        const monthStr = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "")
          ? sp.month!
          : `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
        const [y, m] = monthStr.split("-").map(Number);
        const next = shiftMonth(y, m, 1);
        const from = `${monthStr}-01`;
        const to = `${next}-01`;
        const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

        const [monthWorkouts, exs] = await Promise.all([getWorkoutsInRange(user.id, from, to), listExercises(user.id)]);
        const byDay = new Map<string, typeof monthWorkouts>();
        for (const w of monthWorkouts) byDay.set(w.performedOn, [...(byDay.get(w.performedOn) ?? []), w]);

        const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") && sp.date!.startsWith(monthStr) ? sp.date! : null;
        const detail = selected
          ? await getWorkoutsInRange(user.id, selected, new Date(Date.parse(selected) + 86400000).toISOString().slice(0, 10), true)
          : [];
        const title = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

        return (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{title}</h1>
              <div className="flex gap-2">
                <Link href={`/calendar?month=${shiftMonth(y, m, -1)}`} className="btn-ghost" aria-label="Previous month">←</Link>
                <Link href="/calendar" className="btn-ghost">Today</Link>
                <Link href={`/calendar?month=${next}`} className="btn-ghost" aria-label="Next month">→</Link>
              </div>
            </div>

            {justSaved && <ClearWorkoutDrafts />}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase opacity-70">
              {DOW.map((d) => <div key={d}><span className="sm:hidden">{d[0]}</span><span className="hidden sm:inline">{d}</span></div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const iso = `${monthStr}-${pad(day)}`;
                const ws = byDay.get(iso) ?? [];
                const names = [...new Set(ws.map((w) => w.exerciseName))];
                const isSel = iso === selected;
                const cell = (
                  <div
                    className={`min-h-14 rounded-lg border p-1 text-left text-xs sm:min-h-20 ${
                      isSel ? "border-orange-500 bg-orange-500/10" : ws.length ? "border-orange-500/40 bg-orange-500/5" : "border-stone-300/50 dark:border-stone-800"
                    }`}
                  >
                    <div className="mb-0.5 font-semibold opacity-70">{day}</div>
                    {/* Phones: dots (names don't fit in ~44px cells). Tap a day for the detail below. */}
                    {names.length > 0 && (
                      <div className="flex flex-wrap items-center gap-0.5 sm:hidden" aria-label={`${names.length} exercise${names.length > 1 ? "s" : ""}`}>
                        {names.slice(0, 4).map((n) => <span key={n} className="h-1.5 w-1.5 rounded-full bg-orange-600" />)}
                        {names.length > 4 && <span className="text-[9px] leading-none opacity-70">+{names.length - 4}</span>}
                      </div>
                    )}
                    <div className="hidden sm:block">
                      {names.slice(0, 3).map((n) => (
                        <div key={n} className="truncate rounded bg-orange-600/80 px-1 py-px text-[10px] text-white mb-px">{n}</div>
                      ))}
                      {names.length > 3 && <div className="text-[10px] opacity-70">+{names.length - 3} more</div>}
                    </div>
                  </div>
                );
                return ws.length ? (
                  <Link key={iso} href={`/calendar?month=${monthStr}&date=${iso}#day-detail`} scroll>{cell}</Link>
                ) : (
                  <div key={iso}>{cell}</div>
                );
              })}
            </div>

            {selected && (
              <section id="day-detail" className="card scroll-mt-4 space-y-3">
                <h2 className="font-semibold">
                  {new Date(`${selected}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                </h2>
                {[...new Map(detail.filter((w) => w.sessionDurationSeconds).map((w) => [w.sessionId, w])).values()].map((w) => (
                  <p key={w.sessionId} className="text-sm opacity-80">
                    {w.sessionName ?? "Workout"}: {fmtDuration(w.sessionDurationSeconds!)} total
                  </p>
                ))}
                {detail.map((w) => (
                  <div key={w.id} className="space-y-1 border-t border-stone-300/40 pt-3 first:border-0 first:pt-0 dark:border-stone-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{w.exerciseName}</span>
                      <span className="text-xs opacity-70">{w.sessionName}{w.progression === "reps" || (w.progression === "duration" && w.trainingMax === 0) ? "" : ` · ${w.progression === "duration" ? "Weight" : "TM"} ${fmt(w.trainingMax)} ${user.unit}`}</span>
                    </div>
                    {w.progression !== "reps" && (
                      <CycleProgress cycle={w.cycle} week={w.week} cyclesPerBlock={w.cyclesPerBlock} blockNumber={w.blockNumber} done />
                    )}
                    <p className="font-mono text-sm">
                      {w.progression === "reps" && (
                        <span>
                          {w.sets.map((s) => s.actualReps ?? "–").join(" / ")} reps
                          {w.sets.some((s) => s.restSeconds != null) && (
                            <span className="opacity-60"> · rest {w.sets.map((s) => (s.restSeconds != null ? fmtClock(s.restSeconds) : "–")).join(" / ")}</span>
                          )}
                        </span>
                      )}
                      {w.progression !== "reps" && w.sets.map((s) => (
                        <span key={s.id} className="mr-3 whitespace-nowrap">
                          {s.kind === "joker" ? "J " : ""}{fmtSetValue({ duration: w.progression === "duration", weight: s.actualWeight ?? s.targetWeight, amount: s.actualReps ?? "–", unit: user.unit })}
                          <span className="opacity-50"> /{fmtSetValue({ duration: w.progression === "duration", weight: s.targetWeight, amount: s.targetReps, unit: user.unit })}</span>
                          {s.restSeconds != null && <span className="opacity-60"> ⏱{fmtClock(s.restSeconds)}</span>}
                        </span>
                      ))}
                    </p>
                    {isStraightLike(w.progression) && w.week !== 4 && (() => {
                      const r = evaluateStraightSets(w.sets.filter((s) => s.kind === "main"));
                      return (
                        <p className="text-xs opacity-80">
                          Hit target {w.progression === "duration" ? "time" : "reps"} on {r.hit}/{r.total} sets —{" "}
                          {r.passed
                            ? w.progression === "duration"
                              ? "targets increased"
                              : `weight increased ${fmt(w.increment)} ${user.unit}`
                            : "targets stay the same next week"}
                        </p>
                      );
                    })()}
                    {w.notes && <p className="text-xs italic opacity-70">{w.notes}</p>}
                  </div>
                ))}
              </section>
            )}

            <section className="card space-y-3">
              <h2 className="font-semibold">Where you are now</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {exs.map((e) => (
                  <div key={e.id} className="space-y-1">
                    <span className="text-sm font-medium">{e.name}</span>
                    {e.progression === "reps" ? (
                      <p className="text-xs opacity-70">
                        Bodyweight{e.nextProgression ? ` · next: ${e.nextProgression}` : ""}
                      </p>
                    ) : (
                      <CycleProgress cycle={e.currentCycle} week={e.currentWeek} cyclesPerBlock={e.cyclesPerBlock} blockNumber={e.blockNumber} />
                    )}
                  </div>
                ))}
                {exs.length === 0 && <p className="text-sm opacity-70">No exercises yet.</p>}
              </div>
            </section>
          </>
        );
      }}
    </AppShell>
  );
}
