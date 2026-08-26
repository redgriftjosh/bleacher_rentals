---
description: Run the approved preflight plan, recording a video of every test
argument-hint: [version]
---

Run the preflight plan in `preflight/<version>.md` — the current `package.json`
version when no argument is given.

Refuse to start if the plan does not exist or I have not approved it. Say so and
point at `/preflight` instead.

## How to run

Every test gets its own video. Josh watches all of them once before a production
release, so one file per test is the point — do not batch them.

```bash
set -a && source .env.local && set +a && npx playwright test <spec> --trace=on
```

Two things that will bite:

- **Environment.** `npx playwright test` alone fails with
  `e2e admin helper needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY`.
  Only `npm run test:e2e` sources `.env.local`; the line above does it by hand.
- **Video is off locally.** `playwright.config.ts` sets `video` to `"off"` outside
  CI, and there is no `--video` flag. Write a temporary config that spreads the
  base one and forces `video: "on"`, then **delete it** when the run ends.

`test-results/` is already in `.gitignore`, so the videos never reach GitHub.
Leave it that way — do not commit them.

## Roles

Run each test under the role its plan row names, using the matching project
(`--project=admin|am|driver|viewer|developer`). Public pages use `--project=anon`
and need no login.

A role whose credentials are missing from `.env.local` is **skipped silently** by
`auth.setup.ts` — its tests then run without a session and fail for the wrong
reason. Before running a role, check its `E2E_<ROLE>_EMAIL` / `_PASSWORD` exist.
If they do not, stop and tell me which are missing rather than reporting a
failure that means nothing.

## Report

Update `preflight/<version>.md` in place:

- set `Status:` to `passed` or `failed`
- add the date and the commit SHA it ran against
- per row: result, and for a failure what actually happened
- link each video path

Then send me the videos and tell me plainly what failed. Never describe a test as
passing unless you saw it pass — a skipped role is not a pass.

Leave the human list untouched. Those are mine to do.
