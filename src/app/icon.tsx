import { ImageResponse } from "next/og";
import { BRAND, LOGO_PLATES, PLATE_SHINE } from "@/lib/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser tab icon (replaces favicon.ico): the plate-stack logo on the brand colour. */
export default function Icon() {
  const u = size.width / 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: BRAND.tile, borderRadius: 14 * u }}>
        {LOGO_PLATES.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.x * u, top: p.y * u, width: p.w * u, height: p.h * u, borderRadius: p.r * u, background: p.color, display: "flex" }}>
            <div style={{ position: "absolute", left: p.r * u, top: PLATE_SHINE.inset * u, width: (p.w - 2 * p.r) * u, height: PLATE_SHINE.h * u, borderRadius: (PLATE_SHINE.h / 2) * u, background: "#fff", opacity: PLATE_SHINE.opacity }} />
          </div>
        ))}
      </div>
    ),
    size,
  );
}
