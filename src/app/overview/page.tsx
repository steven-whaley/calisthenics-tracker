import type { Metadata } from "next";
import Link from "next/link";
import { ExpandAll } from "@/components/ExpandAll";

// Public (no sign-in) single-page summary of the app, designed for a desktop browser. It reads no user data. Content is condensed from
// README.md, design.md and CLAUDE.md: update it when those change.

export const metadata: Metadata = {
  title: "App overview | 5/3/1 Tracker",
  description: "Features, design decisions, architecture, Vercel features, deployment and rollback for the 5/3/1 Tracker.",
  robots: { index: false, follow: false },
};

type Item = { icon: string; title: string; text: string; href?: string };

const FEATURES: Item[] = [
  { icon: "🏋️", title: "Progression types", text: "5/3/1, pyramid, reverse pyramid, straight sets, timed sets and bodyweight exercises; changeable later with history kept." },
  { icon: "📈", title: "Training max engine", text: "The training max rises each 3-week cycle, with a deload after the configured number of cycles, then a new block. Optional 1-7 sessions per week." },
  { icon: "🎯", title: "Performance-driven sets", text: "Straight and timed sets only progress after a week where at least 50% of sets hit the target." },
  { icon: "📋", title: "Templates and workouts", text: "Workout days with drag-to-reorder, a timer with rest timing, target vs. actual logging and joker sets." },
  { icon: "📅", title: "Calendar and progress", text: "A calendar of past workouts and a progress table with an estimated 1RM chart." },
  { icon: "📚", title: "Exercise library", text: "Default exercises every user can start from, with suggested progression and sets/reps. Managed by admins, including videos." },
  { icon: "▶️", title: "How-to videos", text: "Search YouTube or paste a link; click-to-play player with a cached thumbnail." },
  { icon: "♻️", title: "Reset, archive, restore", text: "Progression can be reset; exercises are archived (never deleted) after a confirmation and can be restored." },
  { icon: "🤖", title: "AI coach", text: "Estimates a training max, projects a progression and adds exercises after the user approves." },
  { icon: "📱", title: "Phone-first", text: "Installable, large touch targets, and unfinished workouts saved locally so they survive reloads and failed saves." },
  { icon: "👤", title: "Profiles", text: "Google sign-in, per-user data isolation, lb/kg units and weight rounding." },
];

const DECISION_GROUPS: { title: string; blurb: string; items: Item[] }[] = [
  {
    title: "Architecture",
    blurb: "How the system is put together: rendering, data, auth, caching and external services.",
    items: [
      { icon: "🧩", title: "Server components and server actions, not a data API", text: "No REST/GraphQL layer to build and secure; the signed-in user is checked before any database call." },
      { icon: "🚫", title: "No static caching or ISR for pages", text: "Every page is per-user data. The one cached response is the YouTube thumbnail route (immutable, one year)." },
      { icon: "🌊", title: "Suspense streaming to speed up rendering", text: "Pages can't be cached, so the shell streams instead: after only the session-cookie read, the nav and a skeleton reach the browser while the user lookup and page queries run, then the content streams in." },
      { icon: "🐘", title: "Neon HTTP driver with db.batch", text: "Serverless friendly; atomic multi-statement writes without interactive transactions." },
      { icon: "🌿", title: "Separate Neon branches for preview and production", text: "Preview and production data never mix; testing happens against realistic data in the persistent preview branch." },
      { icon: "🔑", title: "Google-only sign-in with JWT sessions", text: "No passwords or session table; our own users.id is the stable key." },
      { icon: "🎬", title: "YouTube videos embedded, never stored", text: "Only the id and title are saved; thumbnail first, the ~1 MB player loads only on play; search is server-side so the API key stays secret." },
      { icon: "🆓", title: "Coach uses free models; math in code", text: "No model cost and no hallucinated numbers; adding an exercise needs explicit approval." },
    ],
  },
  {
    title: "App behavior",
    blurb: "What users see and how training data behaves.",
    items: [
      { icon: "🧮", title: "One pure progression engine", text: "Single source of truth for the UI, writes and the coach; easy to unit test." },
      { icon: "📸", title: "Workouts snapshot TM, cycle and week", text: "History stays correct when an exercise is edited or changes type." },
      { icon: "🗄️", title: "Archive, never delete", text: "Keeps history, calendar and progress intact; archiving is confirmed and reversible." },
      { icon: "🎚️", title: "Performance-driven straight and timed sets", text: "Weight or target only rises when it is earned." },
      { icon: "🔁", title: "One shared cycle/deload structure", text: "Calendar, blocks and progress views work the same for every progression type." },
      { icon: "📖", title: "Default exercises are a library, not copied rows", text: "Each user needs their own training max, so entries only pre-fill the form; library edits never need syncing." },
      { icon: "📶", title: "Phone-first UI with local drafts", text: "Workouts happen on bad signal; unfinished sessions survive reloads, with no service worker and no offline sync to maintain." },
    ],
  },
  {
    title: "Deployment",
    blurb: "How changes are tested, released and configured.",
    items: [
      { icon: "🔀", title: "Work on preview; main only through PRs", text: "Pushes to preview deploy automatically; changes reach production only by merging a PR from preview." },
      { icon: "➕", title: "Additive schema changes, shipped with the PR", text: "Production gets a schema change only with the PR that needs it, applied before the code that uses it, so older code keeps working." },
      { icon: "📍", title: "Functions and database in the same region", text: "Vercel functions in iad1 and Neon in us-east-1 keep each query a short hop; move them together." },
      { icon: "🛠️", title: "Catalog editing limited to admins", text: "Only admin users can add or change exercises in the library; the check runs on the server for every library action." },
    ],
  },
];
const DECISION_COUNT = DECISION_GROUPS.reduce((n, g) => n + g.items.length, 0);

const VERCEL: Item[] = [
  { icon: "▲", title: "Next.js on Vercel", text: "Next.js 16 (App Router) is built and hosted by Vercel with zero configuration.", href: "https://vercel.com/docs/frameworks/full-stack/nextjs" },
  { icon: "🔀", title: "Git integration", text: "Pushes to preview and merges to main build and deploy automatically through the GitHub integration.", href: "https://vercel.com/docs/git" },
  { icon: "🌐", title: "Preview and Production environments", text: "Each environment has its own variables, including DATABASE_URL and the test-login flags.", href: "https://vercel.com/docs/deployments/environments" },
  { icon: "🛡️", title: "Deployment Protection", text: "Preview deployments are protected from public access, so work in progress is only visible to the team.", href: "https://vercel.com/docs/deployment-protection" },
  { icon: "⚡", title: "Fluid Compute", text: "Server components, actions and API routes run as Vercel Functions on Fluid Compute, which reuses function instances across concurrent requests to cut cold starts.", href: "https://vercel.com/docs/fluid-compute" },
  { icon: "📍", title: "Function regions", text: "Functions run in iad1 (N. Virginia), the same region as the Neon branches in us-east-1, so each query is a short hop. Move them together.", href: "https://vercel.com/docs/functions/configuring-functions/region" },
  { icon: "🧠", title: "AI SDK", text: "Vercel AI SDK 7 powers the coach: a ToolLoopAgent with typed tools, streaming to the useChat UI (replies rendered as markdown), and approval before addExercise runs.", href: "https://vercel.com/docs/ai-sdk" },
  { icon: "🚪", title: "AI Gateway", text: "The coach reaches free models through plain provider/model strings, with fallbacks between them.", href: "https://vercel.com/docs/ai-gateway" },
  { icon: "🪪", title: "OIDC tokens", text: "AI Gateway authenticates with the Vercel OIDC token, so there is no API key to store (about 12 hours when pulled locally).", href: "https://vercel.com/docs/oidc" },
  { icon: "🧱", title: "Marketplace: Neon", text: "The Neon integration provisions the Postgres database and the connection variables.", href: "https://vercel.com/docs/marketplace-storage" },
  { icon: "🚀", title: "CDN cache", text: "The thumbnail route is served with an immutable cache header and cached at the edge and in browsers.", href: "https://vercel.com/docs/caching/cdn-cache" },
  { icon: "🔐", title: "Environment variables", text: "Secrets and settings are set per environment (Preview and Production); new values reach only new deployments.", href: "https://vercel.com/docs/environment-variables" },
  { icon: "⏪", title: "Instant Rollback", text: "Promote an earlier Production deployment without rebuilding.", href: "https://vercel.com/docs/instant-rollback" },
];

const IMPROVEMENTS: Item[] = [
  { icon: "⚙️", title: "Cache in-progress workouts", text: "Keep drafts in Redis (for example Upstash) and write Postgres once on completion. Fewer writes; costs another service and makes drafts volatile." },
  { icon: "🗓️", title: "Coach builds templates from goals", text: "Let the coach propose and optionally create templates. Needs a new security model: typed tools only, userId bound by the server, propose-then-approve, prompt-injection defences and rate limits." },
  { icon: "⏱️", title: "Faster next-progression suggestion", text: "Cache by exercise name, seed common answers in the library, use a cheaper call, move it off the critical path, or race the models." },
  { icon: "📥", title: "Import existing data (CSV)", text: "Import exercises, training maxes and history with a dry-run preview, validation, all-or-nothing batches and duplicate detection." },
  { icon: "📦", title: "Bulk exercise creation (CSV)", text: "Create many exercises at once through the existing validation, with per-row errors and a downloadable template." },
  { icon: "🐤", title: "Canary deployments for production", text: "Roll new Production deployments out to a small share of traffic first and widen in stages (Vercel Rolling Releases), so a bad release reaches few users. Needs additive schema changes and care with mixed versions running together.", href: "https://vercel.com/docs/rolling-releases" },
  { icon: "📷", title: "Database snapshot before production schema changes", text: "Create a Neon snapshot or short-lived branch from production just before applying any schema change, so a failed migration can be undone. Costs an extra step unless it is scripted, and a restore loses writes made after the snapshot." },
];

const STEPS: { n: number; title: string; text: string }[] = [
  { n: 1, title: "Develop on preview", text: "All work happens on the preview branch; main is never committed to directly. Run tsc, lint and tests first." },
  { n: 2, title: "Push to origin/preview", text: "The Vercel GitHub integration builds a Preview deployment against the Neon preview branch." },
  { n: 3, title: "Verify the live preview", text: "Once the new deployment is ready, the changed behavior and the main pages are checked on the Preview site before anything moves toward production." },
  { n: 4, title: "Apply schema to production, only if the PR needs it", text: "Additive changes only, applied just before merging and verified read-only. Destructive changes need explicit approval." },
  { n: 5, title: "Open and merge a PR from preview to main", text: "Opened by the owner. Merging triggers the Production deployment on the Neon production branch." },
  { n: 6, title: "Confirm production", text: "Variables set after a deployment only reach new deployments, so redeploy after changing them." },
];

const ROLLBACK: string[] = [
  "Roll the code back by promoting the previous good Production deployment (Vercel dashboard: Deployments, Instant Rollback; or the Vercel CLI rollback command). It takes effect without a rebuild.",
  "Schema changes are additive and are applied before the code that uses them, so the previous code keeps working against the newer schema. There are no down-migrations.",
  "Data is not rolled back by a code rollback. If data needs restoring, use the Neon console to restore or branch from an earlier point (limited by the plan's history window), or recreate the preview branch from production.",
  "To fix forward instead, revert the commit on preview, push, test, and open a new PR to main.",
  "An instant rollback pins production to that deployment until a later deployment is promoted, so merge the fix when it is ready.",
];

const NAV = [
  ["features", "Features"], ["decisions", "Design decisions"], ["architecture", "Architecture"],
  ["vercel", "Vercel features"], ["deploy", "Deployment and rollback"], ["improvements", "Potential improvements"],
];

function Section({ id, icon, title, count, defaultOpen = true, children }: { id: string; icon: string; title: string; count?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details id={id} open={defaultOpen} className="card group scroll-mt-4 p-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl">{icon}</span>
        <h2 className="text-xl font-semibold">{title}</h2>
        {count && <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs dark:bg-white/10">{count}</span>}
        <svg className="ml-auto h-5 w-5 opacity-60 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l5 5 5-5" /></svg>
      </summary>
      <div className="space-y-5 border-t border-black/10 p-5 dark:border-white/10">{children}</div>
    </details>
  );
}

function Tiles({ items, cols = "lg:grid-cols-3" }: { items: Item[]; cols?: string }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${cols}`}>
      {items.map((it) => {
        const body = (
          <>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">{it.icon}</span>
              <h3 className="font-medium leading-tight">{it.title}</h3>
              {it.href && <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Docs ↗</span>}
            </div>
            <p className="text-sm opacity-70">{it.text}</p>
          </>
        );
        const cls = "block rounded-xl border border-black/10 p-4 dark:border-white/10";
        return it.href ? (
          <a key={it.title} href={it.href} target="_blank" rel="noreferrer" className={`${cls} transition hover:border-blue-500/60 hover:bg-blue-500/5`}>{body}</a>
        ) : (
          <div key={it.title} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}

function Hero() {
  return (
    <svg viewBox="0 0 1100 200" role="img" aria-label="5/3/1 Tracker" className="w-full rounded-2xl">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="1100" height="200" fill="url(#hero)" />
      <g fill="#fff" opacity="0.12">
        <rect x="780" y="88" width="260" height="24" rx="12" />
        <rect x="760" y="48" width="36" height="104" rx="10" />
        <rect x="716" y="68" width="30" height="64" rx="8" />
        <rect x="1024" y="48" width="36" height="104" rx="10" />
        <rect x="1070" y="68" width="30" height="64" rx="8" />
      </g>
      <text x="48" y="92" fontSize="44" fontWeight="700" fill="#fff">5/3/1 Tracker</text>
      <text x="48" y="130" fontSize="18" fill="#bfdbfe">Application overview: features, design, architecture, platform and process</text>
      <g fontSize="13" fill="#fff">
        {["Next.js 16", "Neon Postgres", "Auth.js", "AI SDK 7", "Vercel"].map((t, i) => (
          <g key={t} transform={`translate(${48 + i * 128} 152)`}>
            <rect width="116" height="26" rx="13" fill="#fff" opacity="0.15" />
            <text x="58" y="17" textAnchor="middle">{t}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function Box({ x, y, w, h, label, sub, tone = "#3b82f6" }: { x: number; y: number; w: number; h: number; label: string; sub?: string; tone?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={tone} fillOpacity={0.1} stroke={tone} strokeOpacity={0.7} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 2 : h / 2 + 5)} textAnchor="middle" fontSize={14} fontWeight={600} fill="currentColor">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 16} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>{sub}</text>}
    </g>
  );
}

function Arrow({ d, id = "arrow" }: { d: string; id?: string }) {
  return <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.5} markerEnd={`url(#${id})`} />;
}

function Marker({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="currentColor" opacity={0.6} />
    </marker>
  );
}

function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 1000 470" role="img" aria-label="Application architecture" className="w-full">
      <defs><Marker id="arrow" /></defs>
      <rect x={8} y={8} width={210} height={454} rx={14} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="5 5" />
      <text x={24} y={34} fontSize={13} fill="currentColor" opacity={0.7}>Browser (phone-first)</text>
      <Box x={28} y={70} w={170} h={64} label="React 19 UI" sub="server HTML + client components" />
      <Box x={28} y={190} w={170} h={64} label="localStorage" sub="unfinished workout drafts" tone="#f59e0b" />

      <rect x={280} y={8} width={400} height={454} rx={14} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="5 5" />
      <text x={296} y={34} fontSize={13} fill="currentColor" opacity={0.7}>Vercel: Next.js 16 App Router (functions in iad1)</text>
      <Box x={300} y={52} w={360} h={50} label="Server components" sub="reads through lib/data.ts" />
      <Box x={300} y={112} w={360} h={50} label="Server actions" sub="all writes; requireUser() first" />
      <Box x={300} y={172} w={360} h={50} label="POST /api/chat" sub="coach stream (AI SDK ToolLoopAgent)" />
      <Box x={300} y={232} w={360} h={50} label="YouTube routes" sub="search, cached thumbnails" />
      <Box x={300} y={292} w={360} h={50} label="Auth.js v5" sub="Google sign-in, JWT sessions" />
      <Box x={300} y={352} w={360} h={50} label="Progression engine" sub="src/lib/531.ts, pure and shared" tone="#10b981" />

      <Box x={760} y={44} w={220} h={64} label="Neon Postgres" sub="Drizzle, HTTP driver" tone="#10b981" />
      <Box x={760} y={134} w={220} h={56} label="Vercel AI Gateway" sub="free models" tone="#8b5cf6" />
      <Box x={760} y={216} w={220} h={56} label="YouTube" sub="Data API, oEmbed, player" tone="#ef4444" />
      <Box x={760} y={298} w={220} h={56} label="Google OAuth" tone="#f59e0b" />
      <Box x={760} y={380} w={220} h={56} label="GitHub Issues API" sub="in-app issue form" tone="#64748b" />

      <Arrow d="M198 102 H280" />
      <Arrow d="M113 134 V190" />
      <Arrow d="M660 77 H760" />
      <Arrow d="M660 137 H710 V90 H760" />
      <Arrow d="M660 197 H710 V162 H760" />
      <Arrow d="M660 257 H760" />
      <Arrow d="M660 317 H760" />
      <Arrow d="M660 150 H734 V408 H760" />
    </svg>
  );
}

function PipelineDiagram() {
  const nodes = [
    ["Develop", "preview branch", "#3b82f6"], ["Push", "origin/preview", "#3b82f6"], ["Preview deploy", "Neon preview branch", "#8b5cf6"],
    ["Verify", "live preview", "#10b981"], ["PR to main", "schema applied first", "#f59e0b"], ["Production", "Neon production branch", "#ef4444"],
  ] as const;
  return (
    <svg viewBox="0 0 1000 130" role="img" aria-label="Deployment pipeline" className="w-full">
      <defs><Marker id="parrow" /></defs>
      {nodes.map(([a, b, c], i) => (
        <g key={a}>
          <Box x={8 + i * 166} y={30} w={140} h={64} label={a} sub={b} tone={c} />
          {i < nodes.length - 1 && <Arrow id="parrow" d={`M${148 + i * 166} 62 H${174 + i * 166}`} />}
        </g>
      ))}
    </svg>
  );
}

function RollbackDiagram() {
  return (
    <svg viewBox="0 0 1000 190" role="img" aria-label="Rollback flow" className="w-full">
      <defs><Marker id="rarrow" /></defs>
      <Box x={20} y={20} w={180} h={56} label="Deployment A" sub="last good" tone="#10b981" />
      <Box x={290} y={20} w={180} h={56} label="Deployment B" sub="live, has a problem" tone="#ef4444" />
      <Box x={560} y={20} w={180} h={56} label="Promote A" sub="Instant Rollback, no rebuild" tone="#3b82f6" />
      <Box x={810} y={20} w={170} h={56} label="A is live" sub="until next promotion" tone="#10b981" />
      <Arrow id="rarrow" d="M200 48 H290" />
      <Arrow id="rarrow" d="M470 48 H560" />
      <Arrow id="rarrow" d="M740 48 H810" />
      <Box x={20} y={120} w={720} h={48} label="Database: additive schema, so A still runs on B's schema; data is not rolled back" tone="#f59e0b" />
      <Box x={780} y={120} w={200} h={48} label="Data? Neon restore" tone="#64748b" />
    </svg>
  );
}

export default function Overview() {
  return (
    <>
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold">5/3/1 Tracker</Link>
          <Link href="/" className="btn-ghost">Open the app</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-10 pt-6">
            <Hero />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-2 text-sm">
                {NAV.map(([id, label]) => (
                  <a key={id} href={`#${id}`} className="rounded-full border border-black/10 px-3 py-1 hover:bg-blue-500/10 dark:border-white/10">{label}</a>
                ))}
              </nav>
              <ExpandAll targetId="overview-sections" />
            </div>
            <p className="text-sm opacity-70">
              Condensed from README.md, design.md and CLAUDE.md in the repository. Update it when those documents change.
            </p>

            <div id="overview-sections" className="space-y-4">
              <Section id="features" icon="✨" title="Features" count={`${FEATURES.length}`}>
                <Tiles items={FEATURES} />
              </Section>

              <Section id="decisions" icon="🧭" title="Design decisions" count={`${DECISION_COUNT}`} defaultOpen={false}>
                {DECISION_GROUPS.map((g) => (
                  <div key={g.title} className="space-y-3">
                    <div className="flex items-baseline gap-3 border-b border-black/10 pb-1 dark:border-white/10">
                      <h3 className="text-lg font-semibold">{g.title}</h3>
                      <p className="text-sm opacity-60">{g.blurb}</p>
                    </div>
                    <Tiles items={g.items} />
                  </div>
                ))}
              </Section>

              <Section id="architecture" icon="🗺️" title="Architecture">
                <ArchitectureDiagram />
                <ul className="grid gap-x-8 gap-y-2 text-sm opacity-80 md:grid-cols-2">
                  <li>Pages read through server components; every write is a server action that checks the signed-in user and verifies ownership of each id.</li>
                  <li>The exercise library is the only global table; every other table is scoped by userId.</li>
                  <li>All progression math is in one pure engine shared by the UI, server actions and the coach.</li>
                  <li>Environments: a preview deployment with the Neon preview branch, and a production deployment with the Neon production branch.</li>
                </ul>
              </Section>

              <Section id="vercel" icon="▲" title="Vercel features used" count={`${VERCEL.length}`}>
                <Tiles items={VERCEL} />
              </Section>

              <Section id="deploy" icon="🚢" title="Deployment and rollback">
                <PipelineDiagram />
                <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {STEPS.map((s) => (
                    <li key={s.n} className="flex gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">{s.n}</span>
                      <div>
                        <h3 className="font-medium leading-tight">{s.title}</h3>
                        <p className="mt-1 text-sm opacity-70">{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <h3 className="pt-2 text-lg font-semibold">Rollback</h3>
                <RollbackDiagram />
                <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
                  {ROLLBACK.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </Section>

              <Section id="improvements" icon="💡" title="Potential improvements" count={`${IMPROVEMENTS.length}`} defaultOpen={false}>
                <Tiles items={IMPROVEMENTS} />
              </Section>
            </div>
      </main>
    </>
  );
}
