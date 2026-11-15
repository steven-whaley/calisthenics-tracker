import { auth } from "@/auth";
import { parseYouTubeId } from "@/lib/youtube";

export type VideoResult = { id: string; title: string; channel: string; thumbnail: string };

/** Signed-in users only. Search needs YOUTUBE_API_KEY (YouTube Data API v3); pasted links resolve via oEmbed, no key needed. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 150);
  if (!q) return Response.json({ results: [] });

  // A pasted link: look up its title with oEmbed.
  const pasted = parseYouTubeId(q);
  if (pasted) {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${pasted}`)}`,
    ).catch(() => null);
    if (!res?.ok) return Response.json({ results: [], error: "That video could not be found or cannot be embedded." });
    const o = (await res.json()) as { title?: string; author_name?: string };
    return Response.json({
      results: [{ id: pasted, title: o.title ?? "Video", channel: o.author_name ?? "", thumbnail: `https://i.ytimg.com/vi/${pasted}/mqdefault.jpg` }],
    });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return Response.json({ results: [], error: "Search is not configured yet. Paste a YouTube link instead." });
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    safeSearch: "strict",
    maxResults: "8",
    q: `${q} how to`,
    key,
  }).toString();
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return Response.json({ results: [], error: "YouTube search is unavailable right now. Paste a link instead." });
  const data = (await res.json()) as {
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }[];
  };
  const results: VideoResult[] = (data.items ?? [])
    .filter((i) => i.id?.videoId)
    .map((i) => ({
      id: i.id!.videoId!,
      title: decodeEntities(i.snippet?.title ?? "Video"),
      channel: decodeEntities(i.snippet?.channelTitle ?? ""),
      thumbnail: i.snippet?.thumbnails?.medium?.url ?? `https://i.ytimg.com/vi/${i.id!.videoId}/mqdefault.jpg`,
    }));
  return Response.json({ results });
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
