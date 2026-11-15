const ID = /^[A-Za-z0-9_-]{11}$/;
const YEAR = 60 * 60 * 24 * 365;

/**
 * A YouTube thumbnail served from our own domain with an immutable cache header, so it is cached at Vercel's
 * edge and in the browser like a static asset. Thumbnails are public and keyed by video id; only YouTube's
 * image host is ever fetched, and only for well-formed ids, so this is not an open proxy.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) return new Response("Not found", { status: 404 });
  for (const file of ["hq720.jpg", "mqdefault.jpg"]) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${file}`).catch(() => null);
    if (res?.ok) {
      return new Response(res.body, {
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
          "Cache-Control": `public, max-age=${YEAR}, s-maxage=${YEAR}, immutable`,
        },
      });
    }
  }
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
}
