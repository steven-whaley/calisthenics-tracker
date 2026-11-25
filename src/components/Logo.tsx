import { BRAND, LOGO_PLATES, PLATE_SHINE } from "@/lib/brand";

/**
 * The Build logo: a stack of bumper plates in Olympic weight colours, each wider than the last. With `tile` it
 * sits on the near-black app-icon square; without, the plates have a transparent background (for the header).
 */
export function Logo({ size = 28, tile = false, className }: { size?: number; tile?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={className}>
      {tile && <rect width="100" height="100" rx="22" fill={BRAND.tile} />}
      {LOGO_PLATES.map((p, i) => (
        <g key={i}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r} fill={p.color} />
          <rect x={p.x + p.r} y={p.y + PLATE_SHINE.inset} width={p.w - 2 * p.r} height={PLATE_SHINE.h} rx={PLATE_SHINE.h / 2} fill="#fff" opacity={PLATE_SHINE.opacity} />
        </g>
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
