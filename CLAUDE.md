# CLAUDE.md

Working guidelines for this project. Follow them without being reminded.

## Stack

- **Next.js 16** + **React 19** (App Router)
- **PowerSync** (local-first) + **Kysely** for type-safe access to the local DB
- **Supabase** (Postgres, migrations, type generation) as the sync backend
- **Clerk** — authentication
- **PixiJS** — virtualized grid
- **Tailwind CSS 4**, **Radix UI**, shadcn-style components
- **Zustand** — client state
- Tests: **Vitest** (unit/component), **Playwright** (e2e)

## Data Architecture — PowerSync-First (required)

All new code is written local-first with reactive hooks. Full spec:
[docs/POWERSYNC_ARCHITECTURE.md](docs/POWERSYNC_ARCHITECTURE.md).

In short:

- For app data access use `db` (the Kysely wrapper over the local PowerSync DB), **not** `supabase.from(...)` in UI hooks/components.
  - Reactive read → `useTypedQuery(compiled, expect<T>())`
  - One-time read → `typedGetAll(compiled, expect<T>())`
  - Write → `typedExecute(compiled)`
- Pattern: build SQL with Kysely → `.compile()` → pass to a typed helper with `expect<T>()`.
- `expect<T>()` is mandatory — it forces TS to break when the schema changes.
- **Booleans** in local tables are usually stored as `0/1` (read back as `number | null`). If you get a `true/false` type error in a Kysely insert/update, that's why.
- Exception: hitting Supabase directly is acceptable only when the data is too large to sync locally and online-only is acceptable.
- Adding a new table — follow the checklist in POWERSYNC_ARCHITECTURE.md (migration → `npm run gtl` → `AppSchema.ts` → registries).

## PixiJS Grid — z-index

Any work with grid borders/overlays must follow the z-index rules:
[docs/HowToControlBorderZIndex.md](docs/HowToControlBorderZIndex.md). Do not change z-index formulas without checking this document.

---

## Spec-Driven Development (SDD)

Before writing any code or tests for a **large feature**:

1. **Spec:** create/update `docs/specs/[feature-name].md`. It must clearly define:
   - DB schema (Supabase migrations) + PowerSync tables (`AppSchema.ts`).
   - TypeScript types (interfaces, React 19 props).
   - User behavior scenarios (for Playwright).
   - Edge cases and error handling (including Clerk auth errors, PowerSync offline state).
2. **Approval:** show me the spec. Wait for an explicit **"Approved"**.
3. **Implementation:** write code and tests strictly following the approved `*.md`. Changing the locked types or API/schema contracts **is not allowed** without my permission — if a change is needed, update the spec first and get a new "Approved".

For small changes (bug fix, minor UI) SDD may be skipped, but the TDD cycle and the final tests are still mandatory.

## Test-Driven Development (TDD)

When feasible: write the test first (red) → minimal code (green) → refactor. At minimum, every logic change ships with a test.

---

## Definition of Done — do not finish without green tests

**Do not declare a task done until all checks below pass and are shown.** If something is red, fix it — do not hand it off.

### Required cycle

1. Write / change the code.
2. **Static analysis & typing:** `npm run tc` (this is `tsc --noEmit`, checks React 19 / Next.js).
3. **Unit & Component:** `npm run test` (Vitest; or `npx vitest run` for a single non-watch run).
4. **Lint / formatting:** `npm run lint` (Prettier `--check`; fix with `npm run format`).
5. **Client E2E:** `npm run test:e2e` (Playwright; loads `.env.local`). Run it when changes touch the UI or critical user paths.
6. If you touched the DB schema/types — `npm run gtl` (regenerate types from the local Supabase).

> Note: there is no separate ESLint in this project — `npm run lint` == a Prettier format check.

### E2E test users & roles (Playwright)

Playwright auto-starts the dev server (`npm run dev:e2e`) and authenticates via Clerk in
`src/features/manageTeam/e2e/auth.setup.ts`, saving one session per role to
`playwright/.auth/<role>.json`. Role users are seeded in `supabase/seed.sql` and their
credentials live in `.env.local` (`E2E_*`). After changing seeded users run
`npx supabase db reset`.

Access is driven by `is_admin` / `is_viewer` on `Users` and by active rows in
`AccountManagers` / `Drivers` (see `src/features/userAccess/logic/determineAccess.ts`), **not**
by the `Users.role` column.

Role is selected by the spec filename suffix — the matching project supplies the right session:

| File pattern         | Runs as               |
| -------------------- | --------------------- |
| `*.admin.spec.ts`    | Admin                 |
| `*.am.spec.ts`       | Account Manager       |
| `*.driver.spec.ts`   | Driver                |
| `*.viewer.spec.ts`   | Viewer                |
| `*.spec.ts`          | default user (chromium) |

Run one role: `npm run test:e2e -- --project=admin`.

### Final report (always show it, with real command output)

```
- [ ] TS Compilation (npm run tc):       PASSED / FAILED
- [ ] Vitest Suites (npm run test):      PASSED / FAILED
- [ ] Playwright E2E (npm run test:e2e): PASSED / FAILED / SKIPPED (why)
```

- Back each item with the actual tail of the command output, not just a checkmark.
- If a step is skipped (e.g. E2E not relevant) — state it explicitly and explain why. Never pass off a skipped step as passed.

## Useful scripts

```bash
npm run tc            # type-check (tsc --noEmit)
npm run test          # vitest (watch)
npm run lint          # prettier --check
npm run format        # prettier --write (auto-fix formatting)
npm run test:e2e      # playwright e2e
npm run gtl           # generate-types-local (Supabase -> database.types.ts)
npm run dev           # next dev
```
