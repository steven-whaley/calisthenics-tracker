# 5/3/1 Tracker

Multi-user workout tracker built around Jim Wendler's 5/3/1 (plus pyramid, reverse pyramid, straight sets and bodyweight "just reps" progressions), with workout templates, a calendar, and an AI coach.

## Stack
- **Next.js 16** (App Router, React 19, Tailwind 4). `AGENTS.md` warns this Next.js differs from older versions: read `node_modules/next/dist/docs/` before using unfamiliar APIs (e.g. `params`/`searchParams` are Promises; `cacheComponents` is intentionally OFF in `next.config.ts` because every page is per-user dynamic).
- **Neon Postgres** via **Drizzle ORM** + `@neondatabase/serverless` (HTTP driver, so no interactive transactions; use `db.batch([...])` for atomic multi-statement writes).
- **Auth.js v5 (`next-auth@beta`)** with Google only, JWT sessions. `src/auth.ts` upserts a `users` row on first sign-in and stores our own `users.id` in the token (`session.user.id`). Requires verified Google email.
- **Vercel AI SDK 7** (`ai`, `@ai-sdk/react`) through **Vercel AI Gateway** using plain `provider/model` strings. Only zero-priced models are used.
- **Node 26** via `.nvmrc` (the shell default may be older; Next 16 and the AI SDK need Node >= 22; `nvm use` first).
- Deployed on Vercel (project `swvercel/calisthenics-tracker`) through the GitHub integration.

## Commands
```bash
nvm use                 # Node 26
npm run dev
npm test                # vitest: progression engine + suggestion parser
npm run lint
npx tsc --noEmit
npm run build
npm run db:push         # drizzle-kit push (schema -> Neon)
npm run check:models    # verifies the Coach's models are still priced at 0 in the gateway catalog
```
Env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`; AI Gateway auth is automatic via the Vercel OIDC token (`VERCEL_OIDC_TOKEN`, ~12h lifetime locally; refresh with `vercel env pull`). Build with placeholder env vars works: `DATABASE_URL=postgres://u:p@localhost/db AUTH_SECRET=x AUTH_GOOGLE_ID=x AUTH_GOOGLE_SECRET=x npm run build`.

## Layout
```
src/auth.ts                     Auth.js config (Google, JWT, user upsert)
src/db/schema.ts, index.ts      Drizzle schema + Neon client
src/lib/531.ts                  PURE progression engine (schemes, advance, projection, joker sets, straight-set rule)
src/lib/531.test.ts             engine tests
src/lib/data.ts                 read queries, all scoped by userId; requireUser()
src/lib/actions.ts              "use server" actions (exercise/template/profile CRUD, completeSession, coach helpers)
src/lib/exercises.ts            insertExercise() service shared by the form-adjacent code and the coach tool
src/lib/session.ts              Exercise -> SessionExercise view model for the workout form
src/ai/                         coach agent, prompt, models, next-progression suggester
src/app/api/chat/route.ts       Coach streaming endpoint (auth required)
src/app/issues/page.tsx         In-app issue form; submitIssue() creates a GitHub issue (GITHUB_ISSUES_TOKEN) and stores a row in issue_reports
src/app/*/page.tsx              dashboard, exercises, templates, session/[templateId], workout/[id], calendar, progress, coach, settings
src/components/                 AppShell/Nav, ExerciseForm, ProgressionFields, WorkoutForm, TemplateForm, CycleProgress, ProgressChart, CoachChat
scripts/check-free-models.ts    free-model guard
```
Pages use `<AppShell>{(user) => ...}</AppShell>` (render-prop; it calls `requireUser()` and renders the nav). Unauthenticated users are redirected to `/`.

## Data model (src/db/schema.ts)
- `users`: `google_sub` (unique), email, name, image, `unit` (lb|kg), `rounding` (weight rounding increment).
- `exercises`: per-user. Key fields: `category` (upper|lower|other|bodyweight), `progression` (531|pyramid|reverse_pyramid|straight_sets|reps), `training_max`, `starting_tm`, `increment`, `cycles_per_block`, position (`block_number`, `current_cycle`, `current_week` where 4 = deload), `jokers_enabled`, `set_count`/`rep_target` (straight sets and bodyweight), `next_progression` (bodyweight), `archived`.
- `templates` + `template_exercises` (ordered by `position`): named groups of exercises.
- `sessions`: one training day (optionally from a template), `performed_on` date.
- `workouts`: one exercise within a session, snapshotting `block_number`, `cycle`, `week`, `training_max` at the time. `workout_sets`: `kind` (main|joker), target weight/reps, `is_amrap`, actual weight/reps, `rest_seconds` (rest chosen after the set from the per-set rest picker; null if none). `sessions.duration_seconds` is the total workout time from the workout timer; `workout_drafts` holds the autosaved in-progress workout.
- Deleting an exercise is never done; users "archive" (`archived = true`) so history stays.
- Schema changes: edit `schema.ts`, then push to the **Neon `preview` branch** and test there. Production gets the schema change **only as part of creating/merging the PR from `preview` that requires it** (see "Databases"), never earlier. Apply it before the code that uses it is deployed, and prefer additive changes (nullable or defaulted columns; no drops/renames/type changes).

## Databases (Neon branching)
- Two Neon branches: **production** (Vercel Production env) and **preview** (persistent, Vercel Preview env). `DATABASE_URL` is set separately per Vercel environment. Preview deployments and local dev against the preview branch never touch production data.
- The Neon integration's other variables (`POSTGRES_URL*`, `DATABASE_URL_UNPOOLED`, `PG*`) are NOT overridden for Preview and still point at production. Nothing in the app reads them (only `DATABASE_URL`); keep it that way, or override them for Preview too.
- **Connection strings for pushes live in `.env.dbpush`** (git-ignored, separate from `.env.local` so `vercel env pull` can't overwrite them) as `PREV_DATABASE_URL` (Neon preview branch) and `PROD_DATABASE_URL` (production). Do NOT use `vercel env pull`: the Vercel `DATABASE_URL`s are sensitive and pull as the placeholder `"[SENSITIVE]"`, so a pulled file proves nothing about which database it targets. Never print these strings; validate by shape and compare only the endpoint id (the preview and production endpoints differ).
- **Push procedure:** export `DATABASE_URL` for the one command from the right variable, e.g. `export DATABASE_URL="$(python3 -c '...read PREV_DATABASE_URL from .env.dbpush...')" && npm run db:push -- --force`, then verify the change with a read-only query on that same database. Day-to-day schema work goes to **preview only**.
- **Production:** the user authorized using `PROD_DATABASE_URL` (2026-11-07) but wants production schema changes published ONLY when creating and merging a PR from `preview` that requires them, after they are fully tested on preview. So: never push to production while developing. When the user asks to create/merge such a PR, apply the pending schema changes to production just before merging (the code needs them), verify read-only, and mention it in the PR. If the PR has no schema changes, do not touch production. Destructive changes (drop/rename/type change, `--force` data-loss prompts) still need explicit approval first. State what is being applied.
- Keep `.env.dbpush` git-ignored (it is) and never commit or print it.
- The preview branch can drift from production; reset it from production in the Neon console when needed (this discards its data).

## Test-user login (non-production)
- Credentials provider `test-user` (`src/auth.ts`, `src/lib/testLogin.ts`), shown on the landing page only when `testLoginEnabled()`: `ENABLE_TEST_LOGIN === "true"`, `TEST_USER_PASSWORD` set, and `VERCEL_ENV !== "production"` (refused in Production even if the flag is wrongly set).
- Vercel config: `ENABLE_TEST_LOGIN=true` (Preview), `=false` (Production); `TEST_USER_PASSWORD` is a sensitive variable for **Preview only** (never add it to Production). It cannot be read back from Vercel; the generated value is in the git-ignored `.env.testuser`. Never print it.
- The test user is a normal `users` row (`google_sub = local-test-user`, email `test-user@example.invalid`) in whichever DB the deployment uses (the Neon preview branch). To test locally against preview: set `ENABLE_TEST_LOGIN=true`, `TEST_USER_PASSWORD` (from `.env.testuser`) and the preview `DATABASE_URL`. The flow was verified with curl against `/api/auth/callback/test-user`.

## Post-push testing (live preview)
- After every push to `preview`, test against the live preview deployment, **https://workout.dev.swvercel.io**, signed in as the test user (credentials above). Cover the changed behavior and a smoke test (login, dashboard, templates).
- The deployment is behind Vercel Deployment Protection, so a plain `curl` or browser gets redirected to Vercel SSO. Use `vercel curl <path> --deployment https://workout.dev.swvercel.io -- <curl args>` (it bypasses protection with the user's CLI auth), log in via `POST /api/auth/callback/test-user` with the CSRF token, and reuse the cookie jar. Read the password from `.env.testuser`; never print it.
- Wait for the Vercel deployment of the pushed commit to finish before testing (check that the new behavior is present; a stale deployment proves nothing).
- For UI checks, run the app locally against the preview DB (`ENABLE_TEST_LOGIN=true`, preview `DATABASE_URL`, test password) in the browser pane; the live site's UI is reachable in the pane only if the user signs in to Vercel there.

## Progression rules (src/lib/531.ts)
- Cycle structure shared by all weighted types: 3 build weeks, then after `cycles_per_block` cycles a deload week (week 4), then a new block.
- **5/3/1**: 65/75/85 x5+, 70/80/90 x3+, 75/85/95 x5/3/1+, deload 40/50/60 x5. Training max (TM) rises by `increment` after each 3-week cycle. Joker sets (5/3/1 only) are suggested in +5% steps above the top set.
- **Pyramid / reverse pyramid**: fixed percentage tables per week, TM rises per cycle like 5/3/1.
- **Straight sets**: sets x reps (default 5x5) at the working weight (`training_max`), deload at 60%. No automatic bump: after a non-deload week the weight rises by `increment` only if the target reps were hit (at the target weight or heavier) on >= 50% of sets (`evaluateStraightSets`). `advance(state, { bumpAtCycleEnd: false })`.
- **Bodyweight "just reps"** (`category = bodyweight`, `progression = reps`): no weights, TM, schedule, jokers or cycle tracking. TM/increment are stored as 0 placeholders and every view must branch on `progression === "reps"`. The user decides when to move on; `moveToNextProgression` archives the old exercise, creates the next variation, and swaps it into templates.
- Rounding: always call `effectiveRounding(user.rounding, ex.increment)` (not `user.rounding` directly) for an exercise's weights, so increases finer than the profile rounding (e.g. +0.5 with rounding 5) aren't rounded away.
- 1RM estimates use Epley. All weights go through `roundWeight(value, user.rounding)`.

## Workout flow
`/session/[templateId]` or `/workout/[id]` render `WorkoutForm` (one block per exercise, "Doing it" checkbox, optional jokers). `completeSession` (server action) validates ownership and that the submitted week/cycle still matches (stale/double-submit guard, not applied to bodyweight), then in one `db.batch` inserts the session, workouts, sets, and advances each exercise's state. Redirects to the calendar for that date.

## AI coach
- `/coach` (client `CoachChat`, `useChat`) -> `POST /api/chat` -> `createAgentUIStreamResponse` with a per-request `ToolLoopAgent` (`src/ai/coach.ts`, max 6 steps, 4000 output tokens, `reasoning: "low"`, last 40 messages).
- System prompt is `COACH_PROMPT` in `src/ai/prompt.ts`, **kept verbatim from the product requirements (typos included)**, followed by tool-usage notes.
- Tools: `listExercises`, `calculateTrainingMax`, `projectProgression` (deterministic math in code, not the LLM), and `addExercise`, which requires user approval (`toolApproval`; UI shows an Add it / Cancel card).
- Models (`src/ai/models.ts`): `reflection/beam-free` with gateway fallback `nvidia/nemotron-3.5-lightning-free`. **Free models only**: avoid `reflection/beam` (price varies by provider). Re-run `npm run check:models` if models change. Free models have no data-retention guarantees, so keep sensitive data out of prompts.
- `src/ai/suggest.ts` asks the same models for the next harder variation of a bodyweight exercise (e.g. Pike HSPU -> Elevated pike HSPU); used by the exercise form ("Ask coach", also on name blur) and the exercise page.
- The free models are reasoning models whose thinking tokens count against `maxOutputTokens`; a low cap yields an empty answer (`finishReason: "length"`). Keep the cap high and `reasoning: "low"`.
- The AI Gateway needs a credit card on the Vercel team; this is already set up and the coach works.

## Conventions and gotchas
- Every query must be scoped by `userId`; server actions call `requireUser()` first and verify ownership of any id received from the client.
- Server actions that mutate call `revalidatePath("/", "layout")` and then `redirect(...)`.
- Calendar months and "today" use UTC on the server; the workout form defaults its date to the browser's local date.
- Don't write AI SDK code from memory: check `node_modules/ai/docs/` (v7 differs from older versions, e.g. `isStepCount`, `toolApproval`, `createAgentUIStreamResponse({ uiMessages })`).
- Tailwind component classes (`.card`, `.btn`, `.btn-ghost`, `.input`, `.label`, `.th`, `.td`) live in `src/app/globals.css`.
- `.env.local` may contain redacted placeholders; run `vercel env pull .env.local` to restore real values (this overwrites it).

## Mobile
- Phone-first details to preserve: `.input` is 16px below `sm` (iOS zooms smaller fields) and `.btn`/`.btn-ghost`/`.btn-icon` are 44px tall on phones; weight/rep fields set `inputMode`.
- Navigation: `Nav` shows links from `md` up; below that `BottomNav` (fixed tab bar + "More" sheet) is used, with `pb-28` on `<main>` and `.safe-bottom` for the home indicator. Viewport uses `viewport-fit=cover`.
- `WorkoutForm` saves an unfinished workout to `localStorage` (`wf:` keys, 36h expiry) with a Restore/Discard banner, shows an offline banner, and keeps entries on a failed save (it submits via `onSubmit` + `startTransition`, not `<form action>`, which would reset the fields). `ClearWorkoutDrafts` clears drafts after a save (calendar `?saved=1`).
- Template reordering uses pointer-event dragging (works on touch) plus up/down buttons; native HTML5 drag and drop is not used.
- Calendar shows dots on phones and exercise chips from `sm`; wide tables have stacked-card versions for phones.
- PWA: `src/app/manifest.ts` and generated icons at `/pwa-icon/[size]` (180, 192, 512). There is no service worker, so there is no offline loading or offline submit queue.

## Workflow notes
- **Branching:** all work happens on the `preview` branch (stay on it; never commit to `main`). Changes reach `main` only through pull requests from `preview`, opened by the owner. Don't open PRs unless asked.
- **Commit and push to `origin/preview` without asking** after finishing changes on `preview` (verify tsc/lint/tests first). Never commit or push to `main`.
- The owner handles deploys (Vercel GitHub integration) and opening PRs; do not offer to deploy.
- Schema pushes to the Neon `preview` branch need no approval. Production schema pushes happen only when creating/merging the PR from `preview` that requires them (never during development); destructive ones need explicit approval.
