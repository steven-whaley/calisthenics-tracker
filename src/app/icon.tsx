import { ImageResponse } from "next/og";
import { BRAND, LOGO_BAR, LOGO_PLATES } from "@/lib/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser tab icon (replaces favicon.ico): the plate-stack logo on the brand colour. */
export default function Icon() {
  const u = size.width / 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: BRAND.color, borderRadius: 14 * u }}>
        <div style={{ position: "absolute", left: LOGO_BAR.x * u, top: LOGO_BAR.y * u, width: LOGO_BAR.w * u, height: LOGO_BAR.h * u, background: BRAND.dark }} />
        {LOGO_PLATES.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.x * u, top: p.y * u, width: p.w * u, height: p.h * u, borderRadius: (p.h / 2) * u, background: "#fff" }} />
        ))}
      </div>
    ),
    size,
  );
}
