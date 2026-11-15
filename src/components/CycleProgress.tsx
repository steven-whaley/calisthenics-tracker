/** Segmented bar: every week of every cycle in the block, plus the deload. */
export function CycleProgress({
  cycle,
  week,
  cyclesPerBlock,
  blockNumber,
  done = false,
  sessionsPerWeek = 1,
  sessionsDone = 0,
}: {
  cycle: number;
  week: number;
  cyclesPerBlock: number;
  blockNumber: number;
  /** true when showing a completed workout (the position itself counts as finished) */
  done?: boolean;
  /** Times per week (5/3/1-type) and how many are already done this week; shown when more than 1. */
  sessionsPerWeek?: number;
  sessionsDone?: number;
}) {
  const total = cyclesPerBlock * 3 + 1;
  const pos = week === 4 ? cyclesPerBlock * 3 : (cycle - 1) * 3 + (week - 1);
  const base = week === 4 ? "Deload" : `Cycle ${cycle}/${cyclesPerBlock} · Week ${week}`;
  const label = sessionsPerWeek > 1 && !done ? `${base} · Session ${Math.min(sessionsDone + 1, sessionsPerWeek)}/${sessionsPerWeek}` : base;
  return (
    <div className="space-y-1" title={`Block ${blockNumber} · ${label}`}>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => {
          const cls =
            i < pos || (done && i === pos)
              ? "bg-orange-600/50"
              : i === pos
                ? "bg-orange-500 ring-1 ring-orange-300"
                : i === total - 1
                  ? "bg-sky-500/30"
                  : "bg-stone-400/40";
          const gap = i > 0 && i % 3 === 0 ? "ml-1" : "";
          return <span key={i} className={`h-2 flex-1 rounded-sm ${cls} ${gap}`} />;
        })}
      </div>
      <p className="text-sm opacity-70 sm:text-xs">Block {blockNumber} · {label}</p>
    </div>
  );
}
