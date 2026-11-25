/** Brand constants shared by the manifest, metadata, the in-app logo and the generated icons. */
export const BRAND = {
  name: "Build",
  description: "Build strength with planned progressions: 5/3/1, pyramids, straight sets and bodyweight, with every target logged against what you lifted.",
  /** App accent (buttons, theme colour). */
  color: "#ea580c",
  /** Background of the icon tile, near-black so the plate colours stand out. */
  tile: "#1c1917",
} as const;

/**
 * The logo: a stack of Olympic bumper plates in the standard weight colours (green 10, yellow 15, blue 20,
 * red 25). Real bumper plates share one diameter and differ in thickness, so every plate is the same width
 * and each is thicker (heavier) than the one above, which reads as steady progression. Geometry is on a
 * 100 x 100 grid, kept inside the central 80% (the maskable-icon safe zone). Shared by the SVG component and
 * the PNG icon routes.
 */
export const LOGO_PLATES = [
  { x: 10, y: 23, w: 80, h: 8, r: 3.5, color: "#16a34a" },
  { x: 10, y: 33.5, w: 80, h: 10, r: 4, color: "#facc15" },
  { x: 10, y: 46, w: 80, h: 13, r: 4.5, color: "#2563eb" },
  { x: 10, y: 61.5, w: 80, h: 16, r: 5, color: "#dc2626" },
] as const;

/** A soft highlight along the top edge of each plate, so the flat colours read as rubber slabs. */
export const PLATE_SHINE = { inset: 1.2, h: 2, opacity: 0.28 } as const;
