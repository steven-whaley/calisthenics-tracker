# Project skills

Skills are packaged instructions that Claude Code loads for a particular kind of task. They live in `.claude/skills/<name>/SKILL.md` and are checked in, so anyone working on the repo with Claude Code gets them. Rules for working on the repo are in [CLAUDE.md](CLAUDE.md); design and architecture are in [design.md](design.md).

## `live-smoke-test`

Post-push smoke test of the live **preview** deployment (<https://workout.dev.swvercel.io>), signed in as the test user.

- **Location:** [.claude/skills/live-smoke-test/SKILL.md](.claude/skills/live-smoke-test/SKILL.md), backed by [scripts/smoke-live.sh](scripts/smoke-live.sh).
- **When to use:** after every push to the `preview` branch, or when asked to verify the preview site. A stale deployment proves nothing, so the skill waits until the new behavior is actually deployed.
- **What it does:** waits for the deployment, logs in through the non-production test-user provider, and requests the smoke pages (dashboard, templates, exercises, calendar, progress, new exercise, coach, settings), failing on any non-200.
- **Confirming new behavior:**
  - `--page PATH --expect "text"` waits until that text appears in the server-rendered HTML of the page.
  - `--bundle "text"` waits until the text appears in the page's client JavaScript (use it for UI that only renders after interaction, or that only admins can see). Without `--page`, the bundle check looks at `/exercises/new`; pass the page that contains the changed component.
  - `--tries N` sets how many 20-second waits to allow (default 12).
- **Run it:**
  ```bash
  nvm use                       # Node 26
  scripts/smoke-live.sh [--page PATH --expect "text"] [--bundle "text"] [--tries N]
  ```
  It prints `SMOKE TEST PASSED` or `FAILED` and exits non-zero on failure.
- **How it gets in:** the preview is behind Vercel Deployment Protection, so requests go through `vercel curl --deployment ...` (using your Vercel CLI login). The test password is read from the git-ignored `.env.testuser` and is never printed.
- **Not covered:** the script cannot click through forms on the live site. For server actions and UI changes, also run the app locally against the preview database, as described in the skill.

Operational details (test-user setup, environments) are in [CLAUDE.md](CLAUDE.md#test-user-login-non-production-operations).
