export function fmt(n: number | null | undefined): string {
  if (n == null) return "–";
  return String(Math.round(n * 100) / 100);
}

/** 75 -> "1:15", 3725 -> "1:02:05" */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 2700 -> "45 min", 5400 -> "1 h 30 min" */
export function fmtDuration(totalSeconds: number): string {
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  return mins >= 60 ? `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}` : `${mins} min`;
}

/** Seconds as "45s" or "1:30". */
export function fmtSeconds(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** One logged set of a weighted or timed exercise, e.g. "135×5" or "30s" / "25 lb · 30s". */
export function fmtSetValue(opts: { duration: boolean; weight: number | null | undefined; amount: number | string; unit: string }): string {
  // No weight at all (bodyweight straight sets): just the reps.
  if (!opts.duration && opts.weight === 0) return `${opts.amount} reps`;
  if (!opts.duration) return `${fmt(opts.weight)}×${opts.amount}`;
  const amount = typeof opts.amount === "number" ? `${opts.amount}s` : opts.amount === "–" ? "–" : `${opts.amount}s`;
  return opts.weight && opts.weight > 0 ? `${fmt(opts.weight)} ${opts.unit} · ${amount}` : amount;
}
