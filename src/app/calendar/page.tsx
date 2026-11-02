import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CycleProgress } from "@/components/CycleProgress";
import { getWorkoutsInRange, listExercises } from "@/lib/data";
import { fmt } from "@/lib/format";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AppShell>
      {async (user) => {
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

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase opacity-70">
              {DOW.map((d) => <div key={d}>{d}</div>)}
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
                    className={`min-h-20 rounded-lg border p-1 text-left text-xs ${
                      isSel ? "border-orange-500 bg-orange-500/10" : ws.length ? "border-orange-500/40 bg-orange-500/5" : "border-stone-300/50 dark:border-stone-800"
                    }`}
                  >
                    <div className="mb-0.5 font-semibold opacity-70">{day}</div>
                    {names.slice(0, 3).map((n) => (
                      <div key={n} className="truncate rounded bg-orange-600/80 px-1 py-px text-[10px] text-white mb-px">{n}</div>
                    ))}
                    {names.length > 3 && <div className="text-[10px] opacity-70">+{names.length - 3} more</div>}
                  </div>
                );
                return ws.length ? (
                  <Link key={iso} href={`/calendar?month=${monthStr}&date=${iso}`}>{cell}</Link>
                ) : (
                  <div key={iso}>{cell}</div>
                );
              })}
            </div>

            {selected && (
              <section className="card space-y-3">
                <h2 className="font-semibold">
                  {new Date(`${selected}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                </h2>
                {detail.map((w) => (
                  <div key={w.id} className="space-y-1 border-t border-stone-300/40 pt-3 first:border-0 first:pt-0 dark:border-stone-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{w.exerciseName}</span>
                      <span className="text-xs opacity-70">{w.sessionName} · TM {fmt(w.trainingMax)} {user.unit}</span>
                    </div>
                    <CycleProgress cycle={w.cycle} week={w.week} cyclesPerBlock={w.cyclesPerBlock} blockNumber={w.blockNumber} done />
                    <p className="font-mono text-sm">
                      {w.sets.map((s) => (
                        <span key={s.id} className="mr-3 whitespace-nowrap">
                          {s.kind === "joker" ? "J " : ""}{fmt(s.actualWeight ?? s.targetWeight)}×{s.actualReps ?? "–"}
                          <span className="opacity-50"> /{fmt(s.targetWeight)}×{s.targetReps}</span>
                        </span>
                      ))}
                    </p>
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
                    <CycleProgress cycle={e.currentCycle} week={e.currentWeek} cyclesPerBlock={e.cyclesPerBlock} blockNumber={e.blockNumber} />
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
