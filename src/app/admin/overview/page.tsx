import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { isAdminEmail } from "@/lib/admin";

// Admin-only, single-page summary of the app. Content is condensed from README.md, design.md and CLAUDE.md:
// update it when those change.

const FEATURES: [string, string][] = [
  ["Progression types", "5/3/1, pyramid, reverse pyramid, straight sets, timed sets and bodyweight exercises; changeable later with history kept."],
  ["Training max engine", "Training max rises each 3-week cycle, with a deload after the configured number of cycles, then a new block. Optional 1-7 sessions per week."],
  ["Performance-driven sets", "Straight and timed sets only progress after a week where at least 50% of sets hit the target."],
  ["Templates and workouts", "Workout days with drag-to-reorder, a workout timer with rest timing, target vs. actual logging and joker sets."],
  ["Calendar and progress", "Calendar of past workouts and a progress table with an estimated 1RM chart."],
  ["Exercise library", "Default exercises every user can start from, with suggested progression and sets/reps. Managed by admins, including videos."],
  ["How-to videos", "Search YouTube or paste a link; click-to-play player with a cached thumbnail."],
  ["Reset, archive, restore", "Progression can be reset, exercises are archived (never deleted) after a confirmation, and can be restored."],
  ["AI coach", "Estimates a training max, projects a progression and adds exercises after the user approves."],
  ["Phone-first", "Installable, large touch targets, and unfinished workouts saved locally so they survive reloads and failed saves."],
  ["Profiles", "Google sign-in, per-user data isolation, lb/kg units and weight rounding."],
];

const DECISIONS: [string, string][] = [
  ["Server components and server actions instead of a data API", "No REST/GraphQL layer to build and secure; the signed-in user is checked before any database call."],
  ["No static caching or ISR for pages", "Every page is per-user data. The one cached response is the YouTube thumbnail route (immutable, one year)."],
  ["Neon HTTP driver with db.batch", "Serverless friendly; atomic multi-statement writes without interactive transactions."],
  ["One pure progression engine", "Single source of truth for the UI, writes and the coach; easy to unit test."],
  ["Workouts snapshot TM, cycle and week", "History stays correct when an exercise is edited or changes type."],
  ["Archive, never delete", "Keeps history, calendar and progress intact; archiving is confirmed and reversible."],
  ["Performance-driven straight and timed sets", "Weight or target only rises when it is earned."],
  ["One shared cycle/deload structure", "Calendar, blocks and progress views work the same for every progression type."],
  ["Google-only sign-in with JWT sessions", "No passwords or session table; our own users.id is the stable key."],
  ["Two Neon branches", "Preview and production data are separate; production schema changes are additive and ship with the PR that needs them."],
  ["Test-user login, non-production only", "Lets smoke tests sign in without Google; refused in Production even if the flag is set."],
  ["Coach uses free models; math in code", "No model cost and no hallucinated numbers; adding an exercise needs explicit approval."],
  ["Phone-first UI with local drafts", "Workouts happen on bad signal; no service worker, so no offline sync to maintain."],
  ["YouTube videos embedded, never stored", "Only the id and title are saved; thumbnail first, the ~1 MB player loads only on play; search is server-side."],
  ["Default exercises are a library, not copied rows", "Each user needs their own training max, so entries only pre-fill the form. Admins are set by ADMIN_EMAILS and checked in every action."],
];

const VERCEL: [string, string][] = [
  ["Hosting and Git integration", "Next.js 16 runs on Vercel and deploys from GitHub: pushes to preview, merges to main."],
  ["Preview and Production environments", "Separate environment variables per environment, including DATABASE_URL and the test-login flags."],
  ["Deployment Protection", "The preview deployment sits behind Vercel SSO; smoke tests use vercel curl to get through."],
  ["Functions", "Server components, server actions and API routes run in iad1, in the same region as the Neon branches."],
  ["AI Gateway", "The coach calls free models through plain provider/model strings."],
  ["OIDC token", "AI Gateway authenticates automatically with the Vercel OIDC token (about 12 hours locally)."],
  ["Marketplace: Neon integration", "Provisions the Postgres database and branch connection variables."],
  ["CDN caching", "The thumbnail route is served with an immutable cache header and cached at the edge and in browsers."],
  ["Environment variables", "AUTH_*, ADMIN_EMAILS, YOUTUBE_API_KEY and others, set per environment; new values apply only to new deployments."],
];

const IMPROVEMENTS: [string, string][] = [
  ["Cache in-progress workouts", "Keep drafts in Redis (for example Upstash) and write Postgres once on completion. Fewer writes; costs another service and makes drafts volatile."],
  ["Coach builds templates from goals", "Let the coach propose and optionally create templates. Needs a new security model: typed tools only, userId bound by the server, propose-then-approve, prompt-injection defences and rate limits."],
  ["Faster next-progression suggestion", "Cache by exercise name, seed common answers in the library, use a cheaper call, move it off the critical path, or race the models."],
  ["Import existing data (CSV)", "Import exercises, training maxes and history with a dry-run preview, validation, all-or-nothing batches and duplicate detection."],
  ["Bulk exercise creation (CSV)", "Create many exercises at once through the existing validation, with per-row errors and a downloadable template."],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Pairs({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-3">
      {rows.map(([t, d]) => (
        <div key={t}>
          <dt className="text-sm font-medium">{t}</dt>
          <dd className="text-sm opacity-70">{d}</dd>
        </div>
      ))}
    </dl>
  );
}

function Box({ x, y, w, h, label, sub }: { x: number; y: number; w: number; h: number; label: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke="currentColor" strokeOpacity={0.6} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize={12} fontWeight={600} fill="currentColor">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>{sub}</text>}
    </g>
  );
}

function Arrow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.6} markerEnd="url(#arrow)" />;
}

function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 760 400" role="img" aria-label="Application architecture" className="w-full">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="currentColor" opacity={0.6} />
        </marker>
      </defs>
      <rect x={8} y={8} width={170} height={384} rx={10} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
      <text x={20} y={28} fontSize={11} fill="currentColor" opacity={0.7}>Browser (phone-first)</text>
      <Box x={24} y={60} w={138} h={50} label="React 19 UI" sub="server HTML + client" />
      <Box x={24} y={150} w={138} h={50} label="localStorage" sub="workout drafts" />

      <rect x={230} y={8} width={290} height={384} rx={10} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
      <text x={242} y={28} fontSize={11} fill="currentColor" opacity={0.7}>Vercel: Next.js 16 App Router</text>
      <Box x={246} y={44} w={258} h={40} label="Server components" sub="reads" />
      <Box x={246} y={96} w={258} h={40} label="Server actions" sub="all writes, requireUser()" />
      <Box x={246} y={148} w={258} h={40} label="/api/chat" sub="coach stream" />
      <Box x={246} y={200} w={258} h={40} label="YouTube routes" sub="search, cached thumbnails" />
      <Box x={246} y={252} w={258} h={40} label="Auth.js v5" sub="Google, JWT sessions" />
      <Box x={246} y={304} w={258} h={40} label="Progression engine" sub="src/lib/531.ts, pure" />

      <Box x={580} y={36} w={170} h={50} label="Neon Postgres" sub="Drizzle, HTTP driver" />
      <Box x={580} y={112} w={170} h={44} label="Vercel AI Gateway" sub="free models" />
      <Box x={580} y={184} w={170} h={44} label="YouTube" sub="API, oEmbed, player" />
      <Box x={580} y={256} w={170} h={44} label="Google OAuth" />
      <Box x={580} y={328} w={170} h={44} label="GitHub Issues API" sub="in-app issue form" />

      <Arrow d="M162 85 H230" />
      <Arrow d="M93 110 V150" />
      <Arrow d="M504 64 H580" />
      <Arrow d="M504 116 H530 V74 H580" />
      <Arrow d="M504 168 H540 V134 H580" />
      <Arrow d="M504 220 H580" />
      <Arrow d="M504 272 H580" />
      <Arrow d="M504 126 H560 V350 H580" />
    </svg>
  );
}

const STEPS: [string, string][] = [
  ["1. Develop on preview", "All work happens on the preview branch; main is never committed to directly. Run tsc, lint and tests first."],
  ["2. Push to origin/preview", "The Vercel GitHub integration builds a Preview deployment (workout.dev.swvercel.io) against the Neon preview branch."],
  ["3. Smoke test the live preview", "scripts/smoke-live.sh waits for the new deployment, signs in as the test user and checks the changed behavior and the main pages."],
  ["4. Apply schema to production (only if the PR needs it)", "Additive changes only, applied just before merging and verified read-only. Destructive changes need explicit approval."],
  ["5. Open and merge a PR from preview to main", "Opened by the owner. Merging triggers the Production deployment on the Neon production branch."],
  ["6. Confirm production", "Environment variables set after a deployment only reach new deployments, so redeploy after changing them."],
];

const ROLLBACK: string[] = [
  "Roll the code back by promoting the previous good Production deployment (Vercel dashboard: Deployments, Instant Rollback; or the Vercel CLI rollback command). It takes effect without a rebuild.",
  "Schema changes are additive and are applied before the code that uses them, so the previous code keeps working against the newer schema. There are no down-migrations.",
  "Data is not rolled back by a code rollback. If data needs restoring, use the Neon console to restore or branch from an earlier point (limited by the plan's history window), or recreate the preview branch from production.",
  "To fix forward instead, revert the commit on preview, push, test, and open a new PR to main.",
  "An instant rollback pins production to that deployment until a later deployment is promoted, so merge the fix when it is ready.",
];

export default async function Overview() {
  return (
    <AppShell>
      {async ({ user: userP }) => {
        const user = await userP;
        if (!isAdminEmail(user.email)) notFound();
        return (
          <>
            <div>
              <h1 className="text-2xl font-bold">App overview</h1>
              <p className="text-sm opacity-70">
                Summary of the features, design, architecture, Vercel usage, deployment process and roadmap. Condensed from README.md, design.md and CLAUDE.md in the repository; visible to admins only.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {[["features", "Features"], ["decisions", "Design decisions"], ["architecture", "Architecture"], ["vercel", "Vercel features"], ["deploy", "Deployment and rollback"], ["improvements", "Potential improvements"]].map(([id, label]) => (
                <a key={id} href={`#${id}`} className="underline">{label}</a>
              ))}
            </nav>

            <div id="features" className="scroll-mt-4"><Section title="Features"><Pairs rows={FEATURES} /></Section></div>
            <div id="decisions" className="scroll-mt-4"><Section title="Design decisions"><Pairs rows={DECISIONS} /></Section></div>

            <div id="architecture" className="scroll-mt-4">
              <Section title="Architecture">
                <ArchitectureDiagram />
                <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
                  <li>Pages read through server components; every write is a server action that checks the signed-in user and verifies ownership of each id.</li>
                  <li>The exercise library is the only global table; every other table is scoped by userId.</li>
                  <li>All progression math is in one pure engine shared by the UI, server actions and the coach.</li>
                  <li>Environments: preview deployment plus Neon preview branch, and production deployment plus Neon production branch.</li>
                </ul>
              </Section>
            </div>

            <div id="vercel" className="scroll-mt-4"><Section title="Vercel features used"><Pairs rows={VERCEL} /></Section></div>

            <div id="deploy" className="scroll-mt-4">
              <Section title="Deployment and rollback">
                <h3 className="text-sm font-semibold">Deployment process</h3>
                <Pairs rows={STEPS} />
                <h3 className="pt-2 text-sm font-semibold">Rollback</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
                  {ROLLBACK.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </Section>
            </div>

            <div id="improvements" className="scroll-mt-4"><Section title="Potential improvements"><Pairs rows={IMPROVEMENTS} /></Section></div>
          </>
        );
      }}
    </AppShell>
  );
}
