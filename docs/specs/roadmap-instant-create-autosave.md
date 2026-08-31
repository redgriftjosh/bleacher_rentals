# Roadmap: Instant-Create + Autosave + Soft Delete

Status: **Approved** (2026-08-28)

## 1. Goal

`/roadmap/[quarterId]` (Features), `/roadmap/[quarterId]/sprint/[sprintId]` (Tasks) and
`/roadmap/backlog` (Tickets) move to a "create immediately, save as you go" model:

1. Clicking `+ New Feature` / `+ New Task` / `+ Submit Ticket` **immediately** inserts a row
   in the database (a draft).
2. The modal opens already in edit mode for an existing record.
3. Every field change is persisted automatically (debounced ~600 ms).
4. The `Save` button is gone. In its place: a status indicator — `Saving…` (spinner) /
   `Saved` (check) / `Couldn't save · Retry` (error).
5. A `Delete` button (soft delete) is added to all three modals.
6. `RoadmapFeatures` gains a `deleted_at` column (migration) — soft delete, same as
   `RoadmapTasks` already has.

## 2. Key architectural decisions

### 2.1 There is no "new" mode any more

Today `FeatureModal` / `TaskModal` branch everywhere on `id === null` (insert) vs
`id !== null` (update). With instant-create the `null` branch disappears entirely:

- `+ New Feature` → `createDraftFeature(quarterId)` → `router.replace('?feature=<newId>')`
- `+ New Task` → `createDraftTask({ sprintId, quarterId })` → `router.replace('?task=<newId>')`
- `+ Submit Ticket` → `createDraftTicket()` → `router.replace('?ticket=<newId>')`

`saveFeature()` / `saveTask()` (insert-or-update) split into `createDraft*` + `update*`.
Deep-linking into a modal keeps working unchanged.

### 2.2 One shared autosave module (reuse, not copy-paste)

New module `src/lib/autosave/`:

```ts
// src/lib/autosave/types.ts
export type SaveState = "idle" | "saving" | "saved" | "error";

export type AutosaveAdapter<TForm> = {
  /** hydrate: PowerSync row -> form (runs once per id) */
  hydrate: (row: unknown) => TForm;
  /** persist: form -> write into the local DB */
  save: (id: string, form: TForm) => Promise<void>;
  /** the draft is "empty" -> discard it when the modal closes */
  isEmptyDraft: (form: TForm) => boolean;
  /** first commit: draft became non-empty for the first time (system message, auto-subscribe) */
  onFirstCommit?: (id: string, form: TForm) => Promise<void>;
  /** soft delete */
  softDelete: (id: string) => Promise<void>;
};
```

```ts
// src/lib/autosave/useAutosavedRecord.ts
export function useAutosavedRecord<TForm>(opts: {
  id: string | null;
  row: unknown | null; // reactive row from useTypedQuery
  adapter: AutosaveAdapter<TForm>;
  open: boolean;
  debounceMs?: number; // default 600
}): {
  form: TForm | null;
  patch: (partial: Partial<TForm>) => void;
  saveState: SaveState;
  retry: () => void;
  flush: () => Promise<void>; // force a save (on modal close)
  remove: () => Promise<void>; // soft delete
  discardIfEmpty: () => Promise<void>;
};
```

Internal rules:

- **Hydrate exactly once per `id`** (`initializedForRef`, as `TaskModal` already does) — the
  reactive subscription to our own row must not overwrite what the user is typing
  (cursor jumps / echo loop).
- `patch()` → `saveState = "saving"` immediately → debounce → `adapter.save` → `"saved"`.
- On failure → `"error"` + `retry()`; the toast fires **once per error run**, not per attempt.
- `flush()` on unmount/close, so the last keystroke is never lost.
- `onFirstCommit` fires exactly once, when `title` first becomes non-empty.

**Scope of the abstraction.** `useAutosavedRecord` serves exactly three consumers in this task:
`FeatureModal`, `TaskModal` (sprint) and `TaskModal` (backlog). Three real adapters — enough for
the seam to be real rather than hypothetical.

**`useAutoSaveTemplate` is deliberately left alone.** A similar hook already exists
(`src/features/automaticEmails/hooks/useAutoSaveTemplate.ts`), with a single consumer — the email
template editor. Decision: it stays as is. Reasons:

- That feature is out of scope here; the regression risk is not acceptable.
- It does not cover what we need anyway (no `error`/`retry`, no `flush()`, no `onFirstCommit`,
  no soft delete, no empty-draft discard) — porting it would be a rewrite, not a migration.

We accept that two autosave hooks coexist for a while. This is deliberate debt, not an oversight:
if a third independent autosave consumer ever appears, that is the moment to move the template
editor onto the shared module — as its own task.

### 2.3 Draft lifecycle

`title = ''` is the draft marker. No extra column is needed.

| Event                                          | Action                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Click `+ New …`                                | INSERT with `title=''`, default status, `sort_order=0`                |
| First non-empty `title`                        | `onFirstCommit`: auto-subscribe + system message "X created a ticket" |
| Modal closed, `title` empty and no description | **hard delete** the row (a draft never really existed)                |
| `Delete` button                                | `deleted_at = now()` (soft)                                           |
| In list views                                  | drafts render as `Untitled` in muted italic                           |

### 2.4 Chat / notification anti-spam

Today `TaskModal.handleSave` posts a system message and calls
`/api/roadmap/task-message-notify` on every save. With autosave that would flood the thread.
New rule:

- "X created a ticket" — once, from `onFirstCommit`.
- "X made changes to the ticket" — **once per modal session**, on `close`/`flush`, and only if
  fields other people can see actually changed (title/status/developer/feature/sprint) — never
  per keystroke.
- This logic moves into `roadmap/_lib/db/taskActivity.ts` → `notifyTaskChanged(taskId, changedFields)`.

### 2.5 Sprint labels — diff instead of delete-all + insert

`saveFeature` currently deletes every `RoadmapFeatureSprintLabels` row and re-inserts them. Under
autosave that produces needless churn in the sync queue. Replaced by
`syncFeatureSprintLabels(featureId, sprintIds)`, which computes `toAdd` / `toRemove`.

## 3. Database

### 3.1 Migration `supabase/migrations/20260828120000_roadmap_feature_soft_delete.sql`

```sql
alter table public."RoadmapFeatures"
  add column if not exists deleted_at timestamptz;

create index if not exists "RoadmapFeatures_deleted_at_idx"
  on public."RoadmapFeatures" (deleted_at);
```

### 3.2 Consequences

- `npm run gtl` → `database.types.ts`.
- `src/lib/powersync/AppSchema.ts` → `RoadmapFeaturesCols`: `deleted_at: column.text`
  (plus a `deleted_at` index on the table).
- **PowerSync sync rules**: verified — the roadmap buckets use `SELECT "RoadmapFeatures".*`,
  so `deleted_at` reaches the client with no sync-rule change. Confirm the staging/production
  dashboard rules use the same `.*` form before deploying.
- `useFeaturesForQuarter` / `useFeature` → `where deleted_at is null`, plus an optional
  `showDeleted` flag.
- Deleted features must also be filtered out of `TaskModal.featureOptions` and the sprint page's
  `featureMap`.
- `db/features.ts`: `deleteFeature` becomes a soft delete (`deleted_at = now()`);
  `restoreFeature` is added.
  Behaviour change: it used to be a hard delete cascading to `RoadmapFeatureSprintLabels`.
  Labels now survive, which is harmless — the feature itself is filtered out everywhere.

## 4. TypeScript types

```ts
// roadmap/_lib/types.ts
export type Feature = FeatureRow & { sprint_ids: string[] }; // FeatureRow now carries deleted_at

// roadmap/_lib/forms.ts (new)
export type FeatureForm = {
  title: string;
  description: string;
  status: FeatureStatus;
  sprintIds: string[];
};
export type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  featureId: string | null;
  sprintId: string | null;
  quarterId: string | null;
  developerUuid: string | null;
  isBacklog: boolean;
};
```

## 5. UI / UX (iOS-style)

### 5.1 New reusable components

| Component               | File                                     | Purpose                                                                                                       |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `SaveStatusIndicator`   | `src/components/SaveStatusIndicator.tsx` | `saving` → `Loader2 animate-spin` + "Saving…"; `saved` → `Check` + "Saved"; `error` → "Couldn't save · Retry" |
| `DestructiveButton`     | `src/components/DestructiveButton.tsx`   | iOS-red (`#FF3B30`) text button                                                                               |
| `ConfirmDialog`         | `src/components/ConfirmDialog.tsx`       | replaces native `confirm()` — iOS alert (title, body, Cancel / Delete)                                        |
| `FormRow` / `FormGroup` | `roadmap/_lib/components/Form*.tsx`      | iOS "inset grouped list": white rows with hairline separators                                                 |

### 5.2 Visual language

- Overlay: `bg-black/25 backdrop-blur-sm`, 200 ms `ease-out` entrance.
- Card: `rounded-2xl`, `shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]`, no heavy borders.
- Field groups: page background `#F2F2F7`, rows `bg-white`, separator `1px #E5E5EA` inset from
  the left.
- Accent `#007AFF`, destructive `#FF3B30`, secondary text `#8E8E93`.
- Typography: title 17px/600, field 17px/400, caption 13px — an SF-like scale.
- Sprint labels / status render as segmented pills (`rounded-full`), not bordered buttons.
- Modal footer: `Delete` on the left, `SaveStatusIndicator` + `Done` on the right
  (`Done` only closes).
- `prefers-reduced-motion` disables animations; focus rings are preserved (a11y).

### 5.3 Micro-interactions

- After instant-create, focus lands in the `Title` field so the user can type straight away.
- `Saved` must not flicker on every keystroke: the `saving` state has a 400 ms minimum duration.
- The new row appears in the list instantly (PowerSync reactivity) as `Untitled`.
- `Esc` / overlay click → `flush()` + `discardIfEmpty()` + close.

## 6. Scenarios (Playwright)

`src/features/manageTeam/e2e/roadmapAutosave.admin.spec.ts`
(Playwright's `testDir` is `src/features/manageTeam/e2e`, so role specs live there.)

1. **Feature instant-create**: click `+ New Feature` → URL contains `?feature=<uuid>` and an
   `Untitled` row appears in the table.
2. **Feature autosave**: type a title → `Saving…` then `Saved`; reload → the title persisted.
3. **Discard empty draft**: `+ New Feature` → `Esc` without typing → no row in the table.
4. **Feature soft delete**: `Delete` → `ConfirmDialog` → the feature disappears from the list;
   `deleted_at` is non-null in the database.
5. **Task instant-create + autosave** on the sprint page — same as 1–4.
6. **Backlog ticket**: `+ Submit Ticket` → ticket created; after the first non-empty title the
   thread contains exactly **one** "created a ticket" system message; after five title edits, at
   most one "made changes" message once the modal is closed.
7. **Viewer read-only** (`*.viewer.spec.ts`): `+ Submit Ticket` and `Delete` are absent.

## 7. Edge cases

| Case                                           | Behaviour                                                                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline (PowerSync)                            | The local write succeeds → `Saved`. The indicator reflects local state, not server state. Optional: a `Pending sync` badge via `usePowerSyncStatus`. |
| Write failure                                  | `saveState = "error"`, `Retry` button, toast fires once                                                                                              |
| Tab closed mid-debounce                        | `beforeunload` + `flush()`; the PowerSync write is local and fast                                                                                    |
| Two tabs on the same task                      | Hydration happens once, so the second tab does not clobber typing; on reopen it sees current data. Last-write-wins — acceptable (same as today).     |
| Clerk session expired                          | `userUuid === null` → `onFirstCommit` is skipped; the write itself is not blocked                                                                    |
| Non-developer in backlog                       | Forced `isBacklog=true`, `status='to_do'`, `sprintId=null` (the logic currently in `TaskModal.handleSave` moves into `taskAdapter.save`)             |
| `title` cleared on an already-committed record | Do **not** delete — discard applies only to a record that was never committed                                                                        |

## 8. Work plan

1. **Migration + schema**: SQL → `npm run gtl` → `AppSchema.ts` → verify sync rules.
2. **TDD core**: tests for `useAutosavedRecord` (debounce, saving→saved, error/retry, flush,
   hydrate-once, `onFirstCommit` exactly once) → implementation.
3. **Roadmap DB layer**: `createDraftFeature/updateFeature/softDeleteFeature/restoreFeature`,
   `createDraftTask/updateTask`, `syncFeatureSprintLabels`, `notifyTaskChanged` + unit tests.
4. **UI primitives**: `SaveStatusIndicator`, `ConfirmDialog`, `DestructiveButton`, `FormRow` +
   component tests.
5. **FeatureModal** on the new scheme; `[quarterId]/page.tsx` instant-create.
6. **TaskModal** on the new scheme; sprint page and backlog instant-create.
7. **iOS polish** for the modals and list views.
8. **DoD**: `npm run tc`, `npm run test`, `npm run lint`, `npm run test:e2e` — all green.

Out of scope: the email template editor and `useAutoSaveTemplate` are not modified (see 2.2).

## 9. Risks

- **PowerSync sync rules** are not controlled from this repo. The local config uses
  `SELECT "RoadmapFeatures".*`, which picks the new column up automatically; the hosted
  dashboard rules still need an eyeball before deploy.
- **`deleteFeature` semantics change** from hard to soft — existing data is untouched, but every
  read path over features must be checked for a missing `deleted_at` filter.
- **Draft litter** if the browser is killed before `discardIfEmpty` runs. No janitor job is added;
  empty drafts simply show as `Untitled` and can be deleted by hand.
