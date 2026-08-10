# Spec: Release Changelog

**Status:** Awaiting approval
**Author:** Claude
**Date:** 2026-08-10

## Goal

Every release gets a human-authored markdown changelog that is committed to the repo, gated by CI, and inserted into the environment's Supabase DB on merge. Users see an in-app `/changelog` page with an unread indicator that clears once they visit.

## Decisions (locked)

| Decision           | Choice                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Content format     | Markdown (`body_md`), rendered client-side. Not HTML.                                              |
| Read tracking      | Single `Users.changelog_last_read_at` column. No junction table.                                   |
| Version uniqueness | `unique(version)` per database. No `environment` column — each env is a separate Supabase project. |
| File location      | `versions/<version>.md` at repo root. Filename must equal the version exactly.                     |
| Author             | A developer writes the markdown (optionally with Claude's help locally). CI never generates it.    |
| Starting version   | `1.0.0`                                                                                            |
| Data access        | PowerSync local-first, per CLAUDE.md                                                               |
| File retention     | Files stay in `versions/` forever. Insert is idempotent.                                           |

---

## 1. Database Schema

### Migration: `supabase/migrations/<timestamp>_changelog.sql`

```sql
create table public."ChangeLog" (
  id          uuid primary key default gen_random_uuid(),
  version     text        not null unique,
  released_at timestamptz not null default now(),
  body_md     text        not null
);

alter table public."Users"
  add column changelog_last_read_at timestamptz;
```

**RLS.** `ChangeLog` is readable by every authenticated user; nobody writes via PostgREST (inserts happen from CI with the service role key, which bypasses RLS).

```sql
alter table public."ChangeLog" enable row level security;

create policy "changelog_select_authenticated"
  on public."ChangeLog" for select
  to authenticated
  using (true);
-- No insert/update/delete policies: writes are service-role only.
```

`Users.changelog_last_read_at` is covered by the existing `Users` RLS. A user must be able to update **their own** row's column. If the current `Users` update policy is narrower than that, it needs widening — to be confirmed during implementation before writing the migration.

### Version format

`text`, not a composite. Semver `major.minor.patch`, matched by CI against `^\d+\.\d+\.\d+$`. Sorting for display uses `released_at desc`, never string sort on `version` (string sort breaks at `1.10.0` vs `1.9.0`).

---

## 2. PowerSync Wiring

Per the checklist in `docs/POWERSYNC_ARCHITECTURE.md`:

1. Migration applied locally, then `npm run gtl` to regenerate `database.types.ts`.
2. `src/lib/powersync/AppSchema.ts` — add `ChangeLogCols` / `ChangeLog` table (`version`, `released_at`, `body_md` as `column.text`); add `changelog_last_read_at: column.text` to `UsersCols`.
3. `src/lib/zustandRegistery.ts` — add `ChangeLog: () => {}` to `setStaleByTable`. (`TableName` is derived from `Database["public"]["Tables"]`, so the build breaks until this is added.)
4. **Manual step, outside the repo:** add `ChangeLog` to the PowerSync sync rules in the PowerSync dashboard — global bucket, all rows, all authenticated users. Sync rules are not checked into this repo, so this cannot be done in code and must be done by hand per environment (dev / staging / prod).

Timestamps come back from the local DB as `text` (ISO strings), consistent with existing tables.

---

## 3. TypeScript Types

```ts
// src/features/changelog/types.ts
export type ChangeLogEntry = {
  id: string;
  version: string;
  released_at: string; // ISO string from local DB
  body_md: string;
};
```

Reads follow the mandated pattern — Kysely builder → `.compile()` → typed helper with `expect<T>()`:

```ts
// Reactive list, newest first
const compiled = db
  .selectFrom("ChangeLog")
  .select(["id", "version", "released_at", "body_md"])
  .orderBy("released_at", "desc")
  .compile();

const entries = useTypedQuery(compiled, expect<ChangeLogEntry>());
```

### Unread indicator

```ts
// src/features/changelog/hooks/useHasUnreadChangelog.ts
export function useHasUnreadChangelog(): boolean;
```

Logic: reactive query for `max(released_at)` from `ChangeLog` and `changelog_last_read_at` from the current user's `Users` row. Returns `true` when the newest release is strictly newer than the last-read timestamp, or when `changelog_last_read_at` is `null` **and** at least one entry exists.

### Mark as read

```ts
// src/features/changelog/db/markChangelogRead.ts
export async function markChangelogRead(userUuid: string): Promise<void>;
```

Writes `changelog_last_read_at = now()` via `typedExecute`. Called once on `/changelog` mount. Idempotent — safe to call repeatedly.

---

## 4. UI

### Route: `/changelog`

- Server component shell, client component for the list (needs PowerSync hooks).
- Entries newest-first. Each entry: version + formatted release date as the header, then rendered `body_md` below.
- Markdown rendering: `react-markdown` + `remark-gfm` (tables, strikethrough, task lists), styled with `@tailwindcss/typography` (`prose` classes) to get the chat-style look — headers, bullets, code blocks, emoji. Emoji need no special handling; they are plain unicode in the markdown source.
- **Security:** `react-markdown` does not render raw HTML by default. Do **not** enable `rehype-raw`. Changelog content is developer-authored and passes code review, but keeping raw HTML off removes the injection surface entirely.
- Empty state when the table has no rows.

### Indicator

A dot on the nav entry that links to `/changelog`, driven by `useHasUnreadChangelog()`. Clears after the user opens the page (mount → `markChangelogRead`). Exact nav component to be identified during implementation and noted in the PR.

---

## 5. Repo Convention: `versions/`

```
versions/
  1.0.0.md
  1.1.0.md
  1.1.1.md
```

- Filename **must** exactly equal the version in `package.json` for that release, plus `.md`.
- File content is the changelog body: pure markdown, no frontmatter. The whole file becomes `body_md`.
- Files are never deleted.

---

## 6. CI

### 6a. PR gate — extend `.github/workflows/ci-pr.yaml`

New job `changelog`, runs on PRs targeting `develop`, `staging`, `main`. Fails unless **all** hold:

1. `package.json` `version` differs from the version on the target branch.
2. The new version matches `^\d+\.\d+\.\d+$`.
3. `versions/<newVersion>.md` exists.
4. That file is non-empty (more than a trivial number of characters).
5. `versions/<newVersion>.md` is among the files added in this PR's diff against the target branch.

Failure messages state exactly which condition failed and what to do.

**Note on promotion PRs.** A `develop → staging` PR carries versions already merged to `develop` but not yet on `staging`, so condition 5 is satisfied naturally — the file is new _relative to the target branch_. A promotion PR can carry several versions at once; the gate checks the current `package.json` version, and the merge job (6b) inserts **every** missing version, so nothing is dropped.

### 6b. Merge insert — extend `develop.yaml` / `staging.yaml` / `production.yaml`

New step after the existing `supabase db push`:

1. Read every `versions/*.md`.
2. Query the target DB for versions already present in `ChangeLog`.
3. Insert only the missing ones, in ascending semver order, via PostgREST with the service-role key.
4. `released_at` = insert time (so each environment records when _it_ got the release, which is the useful number for that env).

Idempotent by construction — re-running inserts nothing new. Requires a new repo secret per environment holding the service-role key: `DEV_SERVICE_ROLE_KEY`, `STAGING_SERVICE_ROLE_KEY`, `PROD_SERVICE_ROLE_KEY`.

---

## 7. Behavior Scenarios (Playwright)

`src/features/changelog/e2e/changelog.spec.ts`

1. **Unread indicator appears** — seed a `ChangeLog` row newer than the user's `changelog_last_read_at`; nav shows the dot.
2. **Indicator clears on visit** — user opens `/changelog`; dot disappears and stays gone after a reload.
3. **Indicator returns on new release** — insert a newer row; dot reappears.
4. **Markdown renders** — a seeded entry with `#` header, `-` bullets, and an emoji renders as `<h1>`, `<ul><li>`, and visible emoji text — not as literal markdown characters.
5. **Ordering** — multiple entries render newest-first.
6. **Empty state** — no rows, page shows the empty message and no dot.
7. **Raw HTML is not executed** — an entry whose body contains `<img onerror=...>` renders as escaped text, no element created.

### Unit tests (Vitest)

- `useHasUnreadChangelog` — null last-read + entries exist → `true`; last-read newer than newest → `false`; equal timestamps → `false`; no entries + null last-read → `false`.
- Semver comparator used for insert ordering — `1.10.0 > 1.9.0`, `1.0.0 < 1.0.1`.
- CI gate script — table-driven tests over the five failure conditions.

---

## 8. Edge Cases

| Case                                       | Handling                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Version in `package.json` not bumped       | PR gate fails (condition 1).                                                                                                         |
| File named `1.2.md` or `v1.2.0.md`         | PR gate fails (conditions 2/3) — filename must match exactly.                                                                        |
| Version bumped but no file                 | PR gate fails (condition 3).                                                                                                         |
| File exists but was added in an earlier PR | PR gate fails (condition 5) — forces a genuinely new entry.                                                                          |
| Same version merged to staging then main   | Insert is per-DB and idempotent; each env gets one row with its own `released_at`.                                                   |
| Promotion PR carrying several versions     | Merge job inserts all missing versions in semver order.                                                                              |
| Insert step fails mid-run                  | Migrations have already applied. Job fails loudly; re-run is safe (idempotent). Changelog insert never blocks or reverts a deploy.   |
| PowerSync offline                          | Page renders from the local DB. `markChangelogRead` queues locally and syncs on reconnect — the dot clears immediately for the user. |
| User row missing / not yet synced          | `useHasUnreadChangelog` returns `false` rather than flashing a false indicator.                                                      |
| Clerk session absent                       | `/changelog` sits behind existing auth; unauthenticated users are redirected as with any other page.                                 |
| Sync rules not updated in a new env        | Table syncs empty and the page shows the empty state. Documented as a manual per-env step in §2.                                     |

---

## 9. Out of Scope

- AI generation of changelog text in CI. Developers author the files; Claude may help locally.
- Per-entry read receipts and "who read what" analytics (the reason a junction table was rejected).
- Git tags and GitHub Releases.
- Emailing or push-notifying users on release.
- Backfilling changelogs for releases before `1.0.0`.

---

## 10. Definition of Done

- [ ] `npm run tc`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run test:e2e`
- [ ] `npm run gtl` run and `database.types.ts` committed
- [ ] `supabase test db` passes (RLS tests for `ChangeLog`)
- [ ] PowerSync sync rules updated by hand in dev / staging / prod
- [ ] Repo secrets added: `DEV_/STAGING_/PROD_SERVICE_ROLE_KEY`
