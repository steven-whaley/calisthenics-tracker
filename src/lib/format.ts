export function fmt(n: number | null | undefined): string {
  if (n == null) return "–";
  return String(Math.round(n * 100) / 100);
}
