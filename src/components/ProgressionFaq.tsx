import { PROGRESSION_LABELS, type ProgressionType } from "@/lib/531";
import { BODYWEIGHT_NOTE, PROGRESSION_INFO, WENDLER_LINKS } from "@/lib/progressionInfo";

const ORDER: ProgressionType[] = ["531", "pyramid", "reverse_pyramid", "straight_sets", "duration"];

/** Collapsed FAQ card for the top of the dashboard: what each progression type is and when to choose it. */
export function ProgressionFaq() {
  return (
    <details className="card group">
      <summary className="cursor-pointer select-none font-semibold">FAQ: which progression type should I use?</summary>
      <div className="mt-3 space-y-4 text-sm">
        <p className="opacity-80">
          A progression type decides what your sets look like and how your weight (or target) goes up. You pick one per exercise when you
          create it, and you can change it later (that restarts the exercise&rsquo;s schedule but keeps your history).
        </p>

        <div className="rounded-lg border border-stone-300/70 p-3 dark:border-stone-700">
          <p className="font-medium">Quick guide</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 opacity-90">
            <li>Main barbell lift, want a long-term plan: <strong>5/3/1</strong>.</li>
            <li>Want a build-up to a heavy set, or more volume: <strong>Pyramid</strong>.</li>
            <li>Want your best effort first, then volume: <strong>Reverse pyramid</strong>.</li>
            <li>Accessory work, or you prefer earning each step: <strong>Straight sets</strong>.</li>
            <li>Holds and timed work: <strong>Duration</strong>.</li>
            <li>No weights at all: any bodyweight exercise (straight sets or timed).</li>
          </ul>
        </div>

        <div className="space-y-2">
          {ORDER.map((t) => {
            const info = PROGRESSION_INFO[t]!;
            return (
              <details key={t} className="rounded-lg border border-stone-300/70 px-3 py-2 dark:border-stone-700">
                <summary className="cursor-pointer select-none font-medium">{PROGRESSION_LABELS[t]}</summary>
                <dl className="mt-2 space-y-2">
                  <div><dt className="font-medium">What the sets look like</dt><dd className="opacity-90">{info.scheme}</dd></div>
                  <div><dt className="font-medium">How it progresses</dt><dd className="opacity-90">{info.moves}</dd></div>
                  <div><dt className="font-medium">Choose it when</dt><dd className="opacity-90">{info.choose}</dd></div>
                  <div><dt className="font-medium">Keep in mind</dt><dd className="opacity-90">{info.tradeoff}</dd></div>
                </dl>
              </details>
            );
          })}
          <details className="rounded-lg border border-stone-300/70 px-3 py-2 dark:border-stone-700">
            <summary className="cursor-pointer select-none font-medium">Bodyweight exercises</summary>
            <p className="mt-2 opacity-90">{BODYWEIGHT_NOTE}</p>
          </details>
          <details className="rounded-lg border border-stone-300/70 px-3 py-2 dark:border-stone-700">
            <summary className="cursor-pointer select-none font-medium">What are the training max, cycles and deloads?</summary>
            <p className="mt-2 opacity-90">
              Weighted plans work from a <strong>training max</strong>, a deliberately conservative number (usually about 90% of your true
              one-rep max) so you always finish reps with good form. Every 3-week wave is a <strong>cycle</strong>. After a set number of
              cycles comes a light <strong>deload</strong> week to recover, then a new block starts.
            </p>
          </details>
        </div>

        <div>
          <p className="font-medium">Learn more from Jim Wendler</p>
          <ul className="mt-1 space-y-1">
            {WENDLER_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="font-medium text-orange-600 underline">{l.title}</a>
                <span className="opacity-70"> &ndash; {l.note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-60">External links to Wendler&rsquo;s own site. This app implements 5/3/1-style plans and is not affiliated with him.</p>
        </div>
      </div>
    </details>
  );
}
