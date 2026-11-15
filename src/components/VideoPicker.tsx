"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCatalogVideo, addExerciseVideo } from "@/lib/actions";
import type { VideoResult } from "@/app/api/youtube-search/route";

/** "Add video" button: search YouTube (or paste a link) and attach a result to the exercise. */
/** Pass `catalogId` (admin) to attach to a library exercise instead of the user's own exercise. */
export function VideoPicker({ exerciseId, catalogId, defaultQuery }: { exerciseId?: string; catalogId?: string; defaultQuery: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(defaultQuery);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { results: VideoResult[]; error?: string };
      setResults(data.results);
      setMessage(data.error ?? (data.results.length === 0 ? "No videos found." : null));
    } catch {
      setResults([]);
      setMessage("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  function add(v: VideoResult) {
    startTransition(async () => {
      const r = catalogId ? await addCatalogVideo(catalogId, v.id, v.title) : await addExerciseVideo(exerciseId!, v.id, v.title);
      if ("error" in r && r.error) setMessage(r.error);
      else {
        setOpen(false);
        setResults([]);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Add video
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search YouTube or paste a link"
          aria-label="Search YouTube or paste a link"
          autoFocus
        />
        <button className="btn" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </form>
      {message && <p className="text-sm opacity-70">{message}</p>}
      <ul className="space-y-2">
        {results.map((v) => (
          <li key={v.id} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumbnail} alt="" width={120} height={68} loading="lazy" className="h-[68px] w-[120px] shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
              <p className="truncate text-xs opacity-70">{v.channel}</p>
            </div>
            <button type="button" className="btn" disabled={pending} onClick={() => add(v)}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
