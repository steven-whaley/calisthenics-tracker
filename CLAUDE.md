# 5/3/1 Tracker

Multi-user workout tracker built around Jim Wendler's 5/3/1 (plus pyramid, reverse pyramid, straight sets, timed sets and bodyweight progressions), with workout templates, a calendar, and an AI coach.

**Application design, architecture, data model, progression rules and key decisions live in [design.md](design.md). Read it before changing behavior, and update it when a design decision changes.** This file covers how to work on the project: commands, environments, procedures and workflow rules. [README.md](README.md) has setup and the architecture overview.

## Stack at a glance
Next.js 16 (App Router, React 19, Tailwind 4) · Neon Postgres via Drizzle (HTTP driver) · Auth.js v5 (Google, JWT) · Vercel AI SDK 7 via AI Gateway (free models only) · Vercel hosting. Details and rationale: [design.md](design.md#tech-stack).

- `AGENTS.md` warns this Next.js differs from older versions: read `node_modules/next/dist/docs/` before using unfamiliar APIs (e.g. `params`/`searchParams` are Promises; `cacheComponents` is intentionally OFF in `next.config.ts` because every page is per-user dynamic).
- **Node 26** via `.nvmrc` (the shell default may be older; Next 16 and the AI SDK need Node >= 22; `nvm use` first).
- Neon's HTTP driver has no interactive transactions; use `db.batch([...])` for atomic multi-statement writes.
- Don't write AI SDK code from memory: check `node_modules/ai/docs/` (v7 differs from older versions, e.g. `isStepCount`, `toolApproval`, `createAgentUIStreamResponse({ uiMessages })`).

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
scripts/smoke-live.sh   # post-push smoke test of the live preview (see "Post-push testing")
```
Env vars (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`; AI Gateway auth is automatic via the Vercel OIDC token (`VERCEL_OIDC_TOKEN`, ~12h lifetime locally; refresh with `vercel env pull`). Build with placeholder env vars works: `DATABASE_URL=postgres://u:p@localhost/db AUTH_SECRET=x AUTH_GOOGLE_ID=x AUTH_GOOGLE_SECRET=x npm run build`.

- Don't run `npm run build` while `next dev` is running (they share `.next` and the dev server goes into a reload loop). If `.next` was deleted, run `npx next typegen` before `npx tsc --noEmit`.
- `.env.local` may contain redacted placeholders; run `vercel env pull .env.local` to restore real values (this overwrites it).

## Code rules to keep in mind
(Full conventions and rationale: [design.md](design.md#conventions).)
- Every query must be scoped by `userId`; server actions call `requireUser()` first and verify ownership of any id received from the client.
- Server actions that mutate call `revalidatePath("/", "layout")` and then `redirect(...)`.
- Progression math lives in the pure engine `src/lib/531.ts`; add tests in `src/lib/531.test.ts`. Always use `effectiveRounding(user.rounding, ex.increment)` for an exercise's weights.
- Every view must handle bodyweight/weightless exercises (`isWeightless()`, legacy `progression === "reps"`); see [design.md](design.md#progression-engine).
- Tailwind component classes (`.card`, `.btn`, `.btn-ghost`, `.input`, `.label`, `.th`, `.td`) live in `src/app/globals.css`.
- Keep the phone-first details described in [design.md](design.md#mobile) (16px inputs below `sm`, 44px buttons, `inputMode` on number fields, bottom nav).
- The coach's `COACH_PROMPT` in `src/ai/prompt.ts` is **kept verbatim from the product requirements (typos included)**. Coach models must stay zero-priced: re-run `npm run check:models` if models change.
- Schema changes: edit `src/db/schema.ts`, then push to the **Neon `preview` branch** and test there. Production gets the change **only as part of creating/merging the PR from `preview` that requires it** (see "Databases"), never earlier. Apply it before the code that uses it is deployed, and prefer additive changes (nullable or defaulted columns; no drops/renames/type changes).

## Databases (Neon branching): procedure
Design and environments: [design.md](design.md#databases-and-environments).
- Two Neon branches: **production** (Vercel Production env) and **preview** (persistent, Vercel Preview env). `DATABASE_URL` is set separately per Vercel environment. Preview deployments and local dev against the preview branch never touch production data.
- The Neon integration's other variables (`POSTGRES_URL*`, `DATABASE_URL_UNPOOLED`, `PG*`) are NOT overridden for Preview and still point at production. Nothing in the app reads them (only `DATABASE_URL`); keep it that way, or override them for Preview too.
- **Connection strings for pushes live in `.env.dbpush`** (git-ignored, separate from `.env.local` so `vercel env pull` can't overwrite them) as `PREV_DATABASE_URL` (Neon preview branch) and `PROD_DATABASE_URL` (production). Do NOT use `vercel env pull`: the Vercel `DATABASE_URL`s are sensitive and pull as the placeholder `"[SENSITIVE]"`, so a pulled file proves nothing about which database it targets. Never print these strings; validate by shape and compare only the endpoint id (the preview and production endpoints differ).
- **Push procedure:** export `DATABASE_URL` for the one command from the right variable, e.g. `export DATABASE_URL="$(python3 -c '...read PREV_DATABASE_URL from .env.dbpush...')" && npm run db:push -- --force`, then verify the change with a read-only query on that same database. Day-to-day schema work goes to **preview only**.
- **Production:** the user authorized using `PROD_DATABASE_URL` (2026-11-07) but wants production schema changes published ONLY when creating and merging a PR from `preview` that requires them, after they are fully tested on preview. So: never push to production while developing. When the user asks to create/merge such a PR, apply the pending schema changes to production just before merging (the code needs them), verify read-only, and mention it in the PR. If the PR has no schema changes, do not touch production. Destructive changes (drop/rename/type change, `--force` data-loss prompts) still need explicit approval first. State what is being applied.
- Keep `.env.dbpush` git-ignored (it is) and never commit or print it.
- The preview branch can drift from production; reset it from production in the Neon console when needed (this discards its data).

## Test-user login (non-production): operations
Design: [design.md](design.md#authentication).
- Vercel config: `ENABLE_TEST_LOGIN=true` (Preview), `=false` (Production); `TEST_USER_PASSWORD` is a sensitive variable for **Preview only** (never add it to Production). It cannot be read back from Vercel; the generated value is in the git-ignored `.env.testuser`. Never print it.
- To test locally against preview: set `ENABLE_TEST_LOGIN=true`, `TEST_USER_PASSWORD` (from `.env.testuser`) and the preview `DATABASE_URL`. The flow was verified with curl against `/api/auth/callback/test-user`.

## Post-push testing (live preview)
- **Use the `live-smoke-test` skill** (`.claude/skills/live-smoke-test/SKILL.md`, script `scripts/smoke-live.sh`): it waits for the deployment, logs in as the test user and checks the smoke pages; pass `--page/--expect` or `--bundle` to confirm the new behavior is deployed.
- After every push to `preview`, test against the live preview deployment, **https://workout.dev.swvercel.io**, signed in as the test user (credentials above). Cover the changed behavior and a smoke test (login, dashboard, templates).
- The deployment is behind Vercel Deployment Protection, so a plain `curl` or browser gets redirected to Vercel SSO. Use `vercel curl <path> --deployment https://workout.dev.swvercel.io -- <curl args>` (it bypasses protection with the user's CLI auth), log in via `POST /api/auth/callback/test-user` with the CSRF token, and reuse the cookie jar. Read the password from `.env.testuser`; never print it.
- Wait for the Vercel deployment of the pushed commit to finish before testing (check that the new behavior is present; a stale deployment proves nothing).
- For UI checks, run the app locally against the preview DB (`ENABLE_TEST_LOGIN=true`, preview `DATABASE_URL`, test password) in the browser pane; the live site's UI is reachable in the pane only if the user signs in to Vercel there.

## Workflow notes
- **Branching:** all work happens on the `preview` branch (stay on it; never commit to `main`). Changes reach `main` only through pull requests from `preview`, opened by the owner. Don't open PRs unless asked.
- **Commit and push to `origin/preview` without asking** after finishing changes on `preview` (verify tsc/lint/tests first). Never commit or push to `main`.
- The owner handles deploys (Vercel GitHub integration) and opening PRs; do not offer to deploy.
- Schema pushes to the Neon `preview` branch need no approval. Production schema pushes happen only when creating/merging the PR from `preview` that requires them (never during development); destructive ones need explicit approval.
- Keep [design.md](design.md) and the README's architecture section in sync when architecture or key decisions change.
