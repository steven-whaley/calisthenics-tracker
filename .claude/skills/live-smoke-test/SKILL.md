---
name: live-smoke-test
description: Run the post-push smoke test against the live preview deployment (https://workout.dev.swvercel.io) as the test user. Use after every push to the `preview` branch, or when asked to verify the preview/live site.
---

# Post-push live smoke test

Project rule: after every push to `preview`, verify the live preview deployment signed in as the test user. A stale deployment proves nothing, so wait until the new behavior is actually present.

## Run it

```bash
export PATH=/Users/swhaley/.nvm/versions/node/v26.13.0/bin:$PATH
scripts/smoke-live.sh [--page PATH --expect "text in the page HTML"] [--bundle "text only in client JS"]
```

- No flags: waits for the deployment, logs in, checks the smoke pages return 200.
- `--page`/`--expect`: also waits (up to ~4 min) until that text appears in the server-rendered HTML of the page. Use for changed server-rendered output.
- `--bundle`: waits until the text appears in the deployment's client JS. Use for client-rendered UI that only shows after interaction (for example options that appear after changing a select), where the page HTML does not contain it.
- Exit code is non-zero on any failure; the script prints `SMOKE TEST PASSED` or `FAILED`.

The script uses `vercel curl --deployment ...` (the deployment is behind Vercel Deployment Protection, so plain curl is redirected to SSO), logs in via `POST /api/auth/callback/test-user` with the CSRF token, and reads the password from the git-ignored `.env.testuser`. It never prints the password; do not echo it yourself.

## What to cover

1. Always: the script's login and smoke pages (dashboard, templates, exercises, calendar, progress, new exercise, coach, settings).
2. The changed behavior: pass `--expect`/`--bundle` for something that only exists in the new build. For behavior that needs interaction (form submits, server actions), also exercise it locally against the preview DB (see below), since the live UI is behind Vercel SSO.
3. Report plainly: what passed, and anything not verified (for example "did not click through the form on the live site").

## Local end-to-end against the preview DB (for UI/server-action changes)

- Needs the preview DB URL from `.env.dbpush` (`PREV_DATABASE_URL`) and the test password; export `DATABASE_URL`, `ENABLE_TEST_LOGIN=true`, `TEST_USER_PASSWORD`, `AUTH_SECRET=anything AUTH_GOOGLE_ID=x AUTH_GOOGLE_SECRET=x AUTH_TRUST_HOST=true`, then `npm run dev -- -p 3123`. Never print these values.
- Log in with curl against `http://localhost:3123/api/auth/callback/test-user`, take the `authjs.session-token` cookie, and set it in the browser pane with JS (`document.cookie=...`), then drive the page (set field values with the native setter + `input`/`change` events, then `requestSubmit()`).
- Do not run `npm run build` while `next dev` is running (they share `.next` and the dev server goes into a reload loop). If `.next` was deleted, run `npx next typegen` before `npx tsc --noEmit`.
- Verify results with a read-only query on the preview DB, then archive (never delete) any test exercises you created, and stop the dev server.

## Notes

- Do this only for pushes to `preview`. Production schema changes are separate and only happen when creating/merging a PR (see CLAUDE.md "Databases").
- If the Vercel CLI prompts for login or is missing, tell the user instead of working around it.
