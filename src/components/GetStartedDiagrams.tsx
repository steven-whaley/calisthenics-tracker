import { PROGRESSION_LABELS, WEEK_SCHEMES, weekScheme, type ProgressionType, type WeekNumber } from "@/lib/531";

const ACCENT = "#ea580c";

/**
 * Bars for one week of a progression type, drawn from the real engine so the picture always matches the app:
 * bar height is the share of the training max (or working weight), the number above is the reps (seconds for timed sets).
 */
export function SetBars({ type, week = 1 }: { type: ProgressionType; week?: WeekNumber }) {
  const sets = weekScheme({ type }, week).sets;
  const timed = type === "duration";
  const w = 240;
  const h = 150;
  const base = 120; // baseline y
  const maxH = 86;
  const slot = w / sets.length;
  const bar = Math.min(34, slot - 8);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${PROGRESSION_LABELS[type]}, ${sets.length} sets`}>
      <line x1="0" y1={base} x2={w} y2={base} stroke="currentColor" opacity="0.3" />
      {sets.map((s, i) => {
        const bh = Math.max(8, s.pct * maxH);
        const x = slot * i + (slot - bar) / 2;
        const last = i === sets.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={base - bh} width={bar} height={bh} rx="4" fill={last && s.amrap ? ACCENT : "currentColor"} opacity={last && s.amrap ? 1 : 0.55} />
            <text x={x + bar / 2} y={base - bh - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
              {s.reps}{timed ? "s" : ""}{s.amrap ? "+" : ""}
            </text>
            <text x={x + bar / 2} y={base + 15} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">
              {Math.round(s.pct * 100)}%
            </text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 3} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.55">
        {timed ? "seconds per set / % of working weight" : "reps per set / % of training max"}
      </text>
    </svg>
  );
}

/** The 5/3/1 wave: top set of each week as a share of the training max, then the deload and the jump to a higher training max. */
export function CycleWave() {
  const weeks: { w: WeekNumber; label: string; sub: string }[] = [
    { w: 1, label: "Week 1", sub: "5s" },
    { w: 2, label: "Week 2", sub: "3s" },
    { w: 3, label: "Week 3", sub: "5/3/1" },
    { w: 4, label: "Deload", sub: "light" },
  ];
  const W = 560;
  const base = 185;
  const maxH = 110;
  const slot = 110;
  const x0 = 20;
  return (
    <svg viewBox={`0 0 ${W} 245`} className="w-full" role="img" aria-label="A 5/3/1 cycle: three build weeks and a deload, then the training max goes up">
      <defs>
        <marker id="wave-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={ACCENT} />
        </marker>
      </defs>
      <line x1="10" y1={base} x2={W - 10} y2={base} stroke="currentColor" opacity="0.3" />
      {weeks.map(({ w, label, sub }, i) => {
        const sets = WEEK_SCHEMES[w].sets;
        const top = sets[sets.length - 1].pct;
        const bh = top * maxH;
        const x = x0 + i * slot;
        const deload = w === 4;
        return (
          <g key={w}>
            <rect x={x} y={base - bh} width="70" height={bh} rx="6" fill={deload ? "currentColor" : ACCENT} opacity={deload ? 0.3 : 0.4 + i * 0.25} />
            <text x={x + 35} y={base - bh - 7} textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor">{Math.round(top * 100)}%</text>
            <text x={x + 35} y={base + 17} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">{label}</text>
            <text x={x + 35} y={base + 32} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">{sub}</text>
          </g>
        );
      })}
      <path d={`M ${x0 + 3 * slot + 35} 100 C ${x0 + 3 * slot + 35} 28, ${x0 + 35} 28, ${x0 + 35} 68`} fill="none" stroke={ACCENT} strokeWidth="2" markerEnd="url(#wave-arrow)" strokeDasharray="5 4" />
      <text x={(x0 + 35 + x0 + 3 * slot + 35) / 2} y="16" textAnchor="middle" fontSize="12" fontWeight="600" fill={ACCENT}>next cycle: training max goes up</text>
      <text x={W - 10} y="238" textAnchor="end" fontSize="11" fill="currentColor" opacity="0.65">bar = top set, % of training max</text>
    </svg>
  );
}
