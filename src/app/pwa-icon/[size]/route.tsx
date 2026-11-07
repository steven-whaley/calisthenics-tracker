import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512];

/** App icon generated on the fly: /pwa-icon/192 and /pwa-icon/512 for the manifest, /pwa-icon/180 for iOS. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.includes(n)) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ea580c",
          color: "white",
          fontSize: Math.round(n * 0.36), // keeps the text inside the maskable safe zone
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        531
      </div>
    ),
    { width: n, height: n, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
