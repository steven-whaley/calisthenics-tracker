"use client";

import { useState } from "react";

/**
 * Click-to-play YouTube embed. The page only loads a cached thumbnail from our own domain; YouTube's player
 * (about a megabyte of script per video) is loaded when the viewer presses play.
 */
export function VideoPlayer({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/yt-thumb/${youtubeId}`} alt="" loading="lazy" decoding="async" width={1280} height={720} className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-2xl text-white transition group-hover:bg-orange-600" aria-hidden>
              ▶
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
