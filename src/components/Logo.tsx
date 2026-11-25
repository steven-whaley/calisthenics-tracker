import { BRAND, LOGO_BAR, LOGO_PLATES } from "@/lib/brand";

/**
 * The Build logo: a stack of weight plates, each wider than the last. With `tile` it is white plates on the
 * orange app-icon square; without, orange plates on a transparent background (for the header).
 */
export function Logo({ size = 28, tile = false, className }: { size?: number; tile?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={className}>
      {tile && <rect width="100" height="100" rx="22" fill={BRAND.color} />}
      <rect x={LOGO_BAR.x} y={LOGO_BAR.y} width={LOGO_BAR.w} height={LOGO_BAR.h} rx="3" fill={BRAND.dark} />
      {LOGO_PLATES.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.h / 2} fill={tile ? "#fff" : BRAND.color} />
      ))}
    </svg>
  );
}

/** Logo plus the product name, for headers. */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <Logo size={26} />
      {BRAND.name}
    </span>
  );
}
