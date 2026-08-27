---
description: Run the approved preflight plan, recording a watchable video of every test
argument-hint: [version]
---

Run the preflight plan in `preflight/<version>.md` — the current `package.json`
version when no argument is given.

Refuse to start if the plan does not exist or I have not approved it. Say so and
point at `/preflight` instead.

The goal is that I can watch each test and understand what happened without
asking you. A green tick I cannot verify is worth nothing.

## Writing the tests so the recording is readable

**Wrap every logical action in `test.step()`**, named in plain words. Step names
appear in the HTML report as a timeline with durations, so the report reads like
a description of what was done:

```ts
await test.step("Open the new contact form", async () => { ... });
await test.step("Fill in the name and email", async () => { ... });
await test.step("Save, and read the row back from Postgres", async () => { ... });
```

**Pause between steps, and hold at the end.** A recording at full speed is
unwatchable — fields fill instantly and the last frame is gone before it
registers. Put a short wait at the end of each step and a longer one before the
test finishes:

```ts
await page.waitForTimeout(800); // between steps
await page.waitForTimeout(2500); // last step, so the final state is visible
```

Do **not** use `slowMo`. It slows every internal Playwright action, which makes
the video sluggish without making any single moment clearer. Explicit waits keep
the actions at normal speed and give me time to read each state.

## Making the report explain itself

Everything below lands in `playwright-report/index.html`, beside the video.

**State what the test proves, before running it.** Take it from the plan's
"Covers" column:

```ts
test.info().annotations.push({
  type: "proves",
  description: "A viewer's contact insert never reaches Postgres.",
});
test.info().annotations.push({ type: "role", description: "viewer" });
```

**Attach the evidence**, especially anything that is not visible on screen. A
database value is the clearest example — the UI can show success while the write
was rejected:

```ts
await test.info().attach("contact row after save", {
  body: JSON.stringify(row ?? null, null, 2),
  contentType: "application/json",
});
```

Attach a screenshot at any moment that matters and would otherwise flash past:

```ts
await test.info().attach("form filled in", {
  body: await page.screenshot(),
  contentType: "image/png",
});
```

When a test fails, attach a short note in plain words saying what was expected
and what happened instead. Do not make me reconstruct it from a diff.

## How to run

```bash
set -a && source .env.local && set +a && npx playwright test <spec> --trace=on
```

Two things that will bite:

- **Environment.** `npx playwright test` alone fails with
  `e2e admin helper needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY`.
  Only `npm run test:e2e` sources `.env.local`; the line above does it by hand.
- **Video is off locally.** `playwright.config.ts` sets `video` to `"off"`
  outside CI, and there is no `--video` flag. Write a temporary config that
  spreads the base one, then **delete it** when the run ends:

  ```ts
  import base from "./playwright.config";
  export default {
    ...base,
    use: {
      ...base.use,
      headless: false,
      viewport: { width: 1280, height: 720 },
      video: { mode: "on" as const, size: { width: 1280, height: 720 } },
    },
  };
  ```

  Headed and 1280×720 because the default headless recording is tiny and has no
  visible cursor. No `slowMo` — the waits above do that job better.

`test-results/` and `playwright-report/` are already in `.gitignore`, so nothing
recorded reaches GitHub. Leave it that way — do not commit videos.

## Roles

Run each test under the role its plan row names, using the matching project
(`--project=admin|am|driver|viewer|developer`). Public pages use `--project=anon`
and need no login.

A role whose credentials are missing from `.env.local` is **skipped silently** by
`auth.setup.ts` — its tests then run without a session and fail for the wrong
reason. Before running a role, check its `E2E_<ROLE>_EMAIL` / `_PASSWORD` exist.
If they do not, stop and tell me which are missing rather than reporting a
failure that means nothing.

## A test that passes for the wrong reason is worse than no test

Before reporting any result, check that the test actually exercised something.
Ones that have already bitten here:

- asserting a control is **absent** — it passes when the page failed to load at
  all, and it proves little anyway: hiding a button does not close a write path
- looking for a row as a `<button>` when rows are clickable `<tr>` — the modal
  never opened, so the assertions ran against an empty screen
- `getByLabel` on this codebase's `TextField`, whose `<label>` has no `htmlFor`
  and whose `<input>` has no `id` — it matches nothing
- seeding a row straight into Postgres then expecting it on screen — it has to
  travel through PowerSync first, so the wait tests sync, not permissions

If a result surprises you, find out why **before** telling me. A finding that
turns out to be wrong costs more than a slow run.

## Report

Update `preflight/<version>.md` in place:

- set `Status:` to `passed` or `failed`
- add the date and the commit SHA it ran against
- per row: result, and for a failure what actually happened
- note anything you had to rewrite, and why

Then:

```bash
npx playwright show-report
```

Tell me plainly what failed, and which tests are worth watching rather than
making me open all of them. Never describe a test as passing unless you saw it
pass — a skipped role is not a pass.

Leave the human list untouched. Those are mine to do.
