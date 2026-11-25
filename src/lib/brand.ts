/** Brand constants shared by the manifest, metadata, the in-app logo and the generated icons. */
export const BRAND = {
  name: "Build",
  description: "Build strength with planned progressions: 5/3/1, pyramids, straight sets and bodyweight, with every target logged against what you lifted.",
  color: "#ea580c",
  /** Spindle colour, a deep orange. */
  dark: "#7c2d12",
} as const;

/**
 * The logo: a stack of weight plates on a spindle, each plate wider than the one above it, so the stack
 * reads as steady progression. Geometry is on a 100 x 100 grid and kept inside the central 80% (the
 * maskable-icon safe zone). Shared by the SVG component and the PNG icon routes.
 */
export const LOGO_PLATES = [
  { x: 33, y: 22, w: 34, h: 12 },
  { x: 25, y: 37.5, w: 50, h: 12 },
  { x: 17, y: 53, w: 66, h: 12 },
  { x: 10, y: 68.5, w: 80, h: 12 },
] as const;
export const LOGO_BAR = { x: 45.5, y: 11, w: 9, h: 70 } as const;
