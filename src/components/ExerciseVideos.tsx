import { removeExerciseVideo } from "@/lib/actions";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoPicker } from "@/components/VideoPicker";
import type { ExerciseVideo } from "@/db/schema";

/** How-to videos for an exercise: click-to-play players (cached thumbnail first, privacy-enhanced domain) plus the add button. */
export function ExerciseVideos({ exerciseId, exerciseName, videos }: { exerciseId: string; exerciseName: string; videos: ExerciseVideo[] }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">How to</h2>
      </div>
      {videos.length === 0 && <p className="text-sm opacity-70">No videos yet. Add one to see how to perform this exercise.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {videos.map((v) => (
          <figure key={v.id} className="space-y-1">
            <VideoPlayer youtubeId={v.youtubeId} title={v.title} />
            <figcaption className="flex items-start justify-between gap-2 text-sm">
              <span className="line-clamp-2">{v.title}</span>
              <form action={removeExerciseVideo.bind(null, exerciseId, v.id)}>
                <button className="text-xs text-red-600 underline" aria-label={`Remove video ${v.title}`}>Remove</button>
              </form>
            </figcaption>
          </figure>
        ))}
      </div>
      <VideoPicker exerciseId={exerciseId} defaultQuery={exerciseName} />
    </section>
  );
}
