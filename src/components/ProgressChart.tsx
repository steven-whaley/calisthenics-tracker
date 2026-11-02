// Inline SVG: training max (steps) vs. estimated 1RM from the AMRAP set, per workout.
export function ProgressChart({ points, unit }: { points: { tm: number; e1rm: number | null }[]; unit: string }) {
  if (points.length < 2) return null;
  const W = 600, H = 160, P = 28;
  const vals = points.flatMap((p) => [p.tm, p.e1rm ?? p.tm]);
  const min = Math.min(...vals) * 0.95, max = Math.max(...vals) * 1.02;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const line = (get: (p: (typeof points)[number]) => number | null) =>
    points.map((p, i) => ({ v: get(p), i })).filter((d) => d.v != null).map((d, k) => `${k ? "L" : "M"}${x(d.i)},${y(d.v!)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Training max and estimated 1RM (${unit})`}>
      <path d={line((p) => p.tm)} fill="none" stroke="#a8a29e" strokeWidth="2" strokeDasharray="4 3" />
      <path d={line((p) => p.e1rm)} fill="none" stroke="#ea580c" strokeWidth="2" />
      {points.map((p, i) => p.e1rm != null && <circle key={i} cx={x(i)} cy={y(p.e1rm)} r="3" fill="#ea580c" />)}
      <text x={P} y={12} fontSize="10" fill="currentColor" opacity="0.7">— est. 1RM (AMRAP)   - - training max ({unit})</text>
    </svg>
  );
}
