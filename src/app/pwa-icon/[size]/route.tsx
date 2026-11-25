import { ImageResponse } from "next/og";
import { BRAND, LOGO_BAR, LOGO_PLATES } from "@/lib/brand";

const SIZES = [180, 192, 512];

/** App icon generated on the fly: /pwa-icon/192 and /pwa-icon/512 for the manifest, /pwa-icon/180 for iOS. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.includes(n)) return new Response("Not found", { status: 404 });
  const u = n / 100; // the logo is drawn on a 100 x 100 grid
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: BRAND.color }}>
        <div style={{ position: "absolute", left: LOGO_BAR.x * u, top: LOGO_BAR.y * u, width: LOGO_BAR.w * u, height: LOGO_BAR.h * u, borderRadius: 3 * u, background: BRAND.dark }} />
        {LOGO_PLATES.map((p, i) => (
          <div
            key={i}
            style={{ position: "absolute", left: p.x * u, top: p.y * u, width: p.w * u, height: p.h * u, borderRadius: (p.h / 2) * u, background: "#fff" }}
          />
        ))}
      </div>
    ),
    { width: n, height: n, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
