# Work tracker pickup/dropoff time (replaces pickup_at/dropoff_at)

## Why

`pickup_at`/`dropoff_at` (`timestamptz` + IANA zone) added timezone correctness
nobody asked for, at the cost of a date component that has to stay in sync with
`WorkTrackers.date` — it doesn't, and that's what breaks same-day sorting.

Actual practice: one plain time, same clock reading for every viewer regardless
of location ("7am" means 7am to the client, Mike on the west coast, and the
driver on the east end). No timezone. No date — nobody ships a trip that picks
up one day and drops off the next.

Replaces the `20260908220358_work_tracker_pickup_dropoff_at.sql` migration
outright (not yet released) — rewrite that file in place.

## 1. Schema

Drop: `pickup_at`, `pickup_timezone`, `dropoff_at`, `dropoff_timezone`.

New enum:

```sql
create type public.work_tracker_time_mode as enum ('exact', 'flexible', 'any_time');
```

Add, per side (pickup/dropoff):

| Column                          | Type                                            | Meaning                              |
| -------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `pickup_time_mode`               | `work_tracker_time_mode`, default `'any_time'`  | which of the three states |
| `pickup_time_start`              | `time`                                            | the time (exact), or range start (flexible). null for any_time |
| `pickup_time_end`                | `time`                                            | equals `pickup_time_start` for exact. range end for flexible. null for any_time |

Same three for `dropoff_*`.

Check constraint: `time_end >= time_start` when both set (no overnight ranges —
confirmed out of scope). Enum replaces the old text+check approach used for
`worktracker_status` etc. — invalid mode values rejected at the DB level.

`pickup_time`/`dropoff_time` (legacy free text) stay untouched, still mirrored
by trigger, still for `br_driver` only.

## 2. Trigger — `sync_work_tracker_time_text()`

Rewritten to build the mirror text from the new columns instead of
`timestamptz`+zone:

| mode       | `pickup_time` text                          |
| ---------- | -------------------------------------------- |
| `exact`    | `to_char(pickup_time_start, 'HH12:MI AM')`    |
| `flexible` | `to_char(start,'HH12:MI AM') \|\| ' - ' \|\| to_char(end,'HH12:MI AM')` |
| `any_time` | unchanged (no overwrite — matches today's "don't touch rows with nothing set" rule) |

Fires only when the relevant `_mode`/`_start`/`_end` changed, same as today.

## 3. PowerSync (`AppSchema.ts`, web + mobile)

Remove `pickup_at`/`pickup_timezone`/`dropoff_at`/`dropoff_timezone`.
Add `pickup_time_mode/start/end`, `dropoff_time_mode/start/end` — all
`column.text` (SQLite has no `enum` or `time` type; `_mode` syncs as the enum's
string value, `time_start`/`time_end` as `"HH:MM:SS"` strings, sorted correctly
as text).

`npm run gtl` to regenerate `database.types.ts`.

## 4. Types

```ts
type WorkTrackerTimeMode = Enums<"work_tracker_time_mode">; // "exact" | "flexible" | "any_time"
```

`formatWorkTrackerTime` (`util.ts`) replaced by a function reading
`(mode, start, end)`:

- `exact` → `"7:00 AM"`
- `flexible` → `"7:00 AM - 9:00 AM"`
- `any_time` → `"Any Time"`

No timezone parameter anywhere. Delete `deriveTimezone.ts`,
`workTrackerTimeField.ts`'s zone-sync/resync/reanchor helpers, and the
sync/DST warning UI in `WorkTrackerTimeField.tsx` — none of it applies once
there's no zone and no date.

## 5. UI — `WorkTrackerTimeField.tsx`

Per side: a 3-way toggle (Exact / Flexible / Any Time).

- **Exact** — one time input. Writes `start = end = value`.
- **Flexible** — two time inputs (From / To). Writes both.
- **Any Time** — no input shown. Writes `start = end = null`.

Switching Exact → Flexible seeds `end = start + 1hr` (edit from there).
Switching to Any Time clears both.

## 6. Sorting

Every list that orders work trackers: primary `date`, secondary
`pickup_time_start asc nulls last`. Plain time comparison — no `is null`
timestamp trick needed since there's no date/instant involved.

Applies to: `useWorkTrackersForWeek.ts`, `db.ts` (`fetchWorkTrackersForUserUuidAndStartDate`,
feeds the PDF), `useAllWorkTrackersData.ts` (confirm with you before adding —
asked last time, no answer yet).

## 7. Save / change-detection (`workTrackerEditPolicy.ts`, `db.ts`, `createWorkTrackerDraft.ts`)

Same shape as the `_at`/`_timezone` fields they replace: compared directly
(plain string equality — no `normalizeInstant`, they're already
canonical `HH:MM:SS`), written on save, omitted (cast) on a new draft.

## 8. Tests

| Level      | File                                             | Covers                                                    |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------- |
| pgTAP      | `work_tracker_pickup_dropoff_time.test.sql`       | column/check constraints; trigger text for all 3 modes    |
| Vitest     | `util.test.ts`                                    | new formatter, all 3 modes, both sides                    |
| Vitest     | `workTrackerTimeField.test.ts`                    | rewritten for mode/start/end, no zone helpers              |
| Vitest     | `workTrackerEditPolicy.test.ts`                   | change-detection on the 6 new fields                        |
| Playwright | `workTrackers/e2e/pickupDropoffTime.admin.spec.ts` | set Exact, Flexible, Any Time; reload; verify persisted    |

## Out of scope

- `br_driver` mobile — reads `pickup_time`/`dropoff_time` text only, unaffected.
- Timezone: explicitly deferred, not designed for here. Re-adding later means a
  new column + migration, not a revival of the deleted one (this one dies).

## Decisions to confirm

1. **Flexible seed gap** — 1 hour, arbitrary. Say the word for a different default.
2. **`useAllWorkTrackersData.ts` secondary sort** — add it or leave date-only?
3. **Migration**: rewrite `20260908220358_...sql` in place (destroys the
   `pickup_at`/`dropoff_at` columns and any data already in them on whatever
   environment has run it) vs. a fresh migration that also drops the old
   columns. Rewrite-in-place assumes nobody has real data in `pickup_at` yet —
   confirm.
