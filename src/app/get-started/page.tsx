import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CycleWave, SetBars } from "@/components/GetStartedDiagrams";
import { ProgressionFaq } from "@/components/ProgressionFaq";
import { PROGRESSION_LABELS, type ProgressionType } from "@/lib/531";
import { PROGRESSION_INFO } from "@/lib/progressionInfo";

export const metadata = { title: "How to get started | Build" };

const STEPS = [
  { icon: "👤", title: "Set your units", text: "Choose lb or kg and how weights round (for example to the nearest 5) in your profile.", href: "/settings", cta: "Open profile" },
  { icon: "🏋️", title: "Add your exercises", text: "Pick from the library or create your own. Enter a training max, usually about 90% of your best recent max.", href: "/exercises/new", cta: "New exercise" },
  { icon: "📋", title: "Group them into workout days", text: "A template is one training day: squat day, upper body, a bodyweight circuit.", href: "/templates/new", cta: "New template" },
  { icon: "✅", title: "Log your workout", text: "Open Today, start a workout and record what you actually lifted next to the target. Unfinished sessions are saved.", href: "/dashboard", cta: "Go to Today" },
  { icon: "📈", title: "Watch it progress", text: "Weights advance automatically each cycle (or when you earn it). The calendar and progress charts show the trend.", href: "/progress", cta: "See progress" },
];

const SHAPES: ProgressionType[] = ["531", "pyramid", "reverse_pyramid", "straight_sets", "duration"];

const PATHS: { q: string; a: string; type: string; icon: string }[] = [
  { q: "A main barbell lift you want to grow for years", a: "Planned waves with a rep-out and built-in recovery", type: "5/3/1", icon: "🏆" },
  { q: "You like building up to one heavy set", a: "More volume, climbing weight", type: "Pyramid", icon: "⛰️" },
  { q: "You are strongest at the start of the session", a: "Heaviest set first, then back-off volume", type: "Reverse pyramid", icon: "⬇️" },
  { q: "Accessory work, or you want to earn each step", a: "Same weight every set, moves up when you hit it", type: "Straight sets", icon: "🟰" },
  { q: "Planks, hangs and other holds", a: "Target time per set", type: "Duration", icon: "⏱️" },
  { q: "No weights at all (push-ups, pull-ups)", a: "Straight or timed sets; set a harder variation to move on to", type: "Bodyweight", icon: "🤸" },
];

export default function GetStarted() {
  return (
    <AppShell>
      {async ({ user }) => {
        await user;
        return (
          <>
            <section className="overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-amber-400/10 to-transparent p-6">
              <div className="flex items-center gap-4">
                <span aria-hidden className="text-5xl sm:text-6xl">🏋️</span>
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">How to get started</h1>
                  <p className="mt-1 text-sm opacity-80">
                    Five steps from a blank app to your first logged workout, and a plain-English guide to choosing how each exercise progresses.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">1. Your first workout in five steps</h2>
              <ol className="grid gap-3 sm:grid-cols-2">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="card flex gap-3">
                    <span aria-hidden className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-orange-500/15 text-2xl">{s.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold"><span className="text-orange-600">{i + 1}.</span> {s.title}</p>
                      <p className="mt-0.5 text-sm opacity-80">{s.text}</p>
                      <Link href={s.href} className="mt-1 inline-block text-sm font-medium text-orange-600 underline">{s.cta} &rarr;</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">2. What the sets look like</h2>
              <p className="text-sm opacity-80">
                Each bar is one set in a typical week: its height is how heavy it is compared with your training max, and the number on top is the reps
                (seconds for timed sets). The orange bar is a rep-out: do as many good reps as you can.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SHAPES.map((t) => (
                  <div key={t} className="card">
                    <p className="font-semibold">{PROGRESSION_LABELS[t]}</p>
                    <SetBars type={t} />
                    <p className="text-xs opacity-75">{PROGRESSION_INFO[t]!.choose}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card space-y-2">
              <h2 className="text-lg font-semibold">3. How a 5/3/1 cycle moves</h2>
              <p className="text-sm opacity-80">
                Three build weeks get heavier, then a light deload week lets you recover. After each 3-week cycle your training max goes up by a small,
                fixed amount, so the same percentages mean slightly heavier weights next time. Pyramid and reverse pyramid use the same wave.
              </p>
              <CycleWave />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">4. Which one should I pick?</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {PATHS.map((p) => (
                  <div key={p.type} className="card flex items-center gap-3">
                    <span aria-hidden className="text-3xl">{p.icon}</span>
                    <div className="min-w-0 text-sm">
                      <p className="opacity-80">{p.q}</p>
                      <p className="mt-0.5 font-semibold"><span aria-hidden className="text-orange-600">&rarr; </span>{p.type}</p>
                      <p className="text-xs opacity-70">{p.a}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs opacity-70">You can change an exercise&rsquo;s type later; your logged history is kept and the schedule restarts.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">5. Frequently asked questions</h2>
              <ProgressionFaq open />
            </section>
          </>
        );
      }}
    </AppShell>
  );
}
