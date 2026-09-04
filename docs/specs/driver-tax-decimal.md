# Driver tax as a decimal rate (`Drivers.tax_dec`)

## Why

Quebec's combined rate is **14.975 %**. Several US states and Canadian
provinces produce rates with fractions too. `Drivers.tax` is an `integer`, so
every such rate is silently truncated and every weekly driver payout computed
from it is wrong.

`tax` cannot simply change type: shipped versions of the driver app
(`br_driver`) still read it. So `tax` stays, becomes **deprecated**, and is kept
in sync by a database trigger.

## 1. Database (Supabase)

New migration `supabase/migrations/20260905120000_driver_tax_dec.sql`:

```sql
alter table public."Drivers"
  add column if not exists tax_dec numeric(6,3) not null default 0;

update public."Drivers" set tax_dec = tax where tax_dec = 0 and tax <> 0;

comment on column public."Drivers".tax    is 'DEPRECATED — whole-percent mirror of tax_dec, kept for old br_driver builds. Written by sync_driver_tax(); do not write directly.';
comment on column public."Drivers".tax_dec is 'Driver tax rate in percent, 3 decimals (e.g. 14.975 for Quebec).';
```

`numeric(6,3)` → max 3 digits after the point, up to `999.999`; the rate is a
percentage, so the range is ample.

### Trigger `sync_driver_tax`

`before insert or update on "Drivers"`, `for each row`:

| Case                                   | Effect                       |
| -------------------------------------- | ---------------------------- |
| `tax_dec` changed (new value written)  | `tax := round(tax_dec)::int` |
| only `tax` changed (legacy/API writer) | `tax_dec := tax`             |
| neither changed                        | no-op                        |

`round()` is half-up, so `14.975 → 15`. The second row is what keeps an old
client, or a hand-written SQL update, from leaving the pair inconsistent; new
code never writes `tax` itself.

On `insert`, a non-zero `tax_dec` wins; otherwise a non-zero `tax` seeds
`tax_dec`.

## 2. PowerSync

SQLite has no `DECIMAL`. In both `AppSchema.ts` files (web
`src/lib/powersync/AppSchema.ts`, mobile `library/powersync/AppSchema.ts`):

```ts
tax: column.integer,   // DEPRECATED — mirror of tax_dec
tax_dec: column.real,
```

`column.real` is the float column PowerSync casts the Postgres `numeric` into,
so it reads back as `number | null` — same convention the architecture doc sets
out for booleans-as-0/1.

**Action outside the repo:** the PowerSync Cloud sync rules for `Drivers` must
list `tax_dec` (or select `*`), otherwise the column never reaches any client.

`database.types.ts` in both repos is regenerated with `npm run gtl`.

## 3. Types

- `CurrentUserState.tax: number | undefined` → **`taxDec: number | undefined`**.
- Every Kysely alias `"d.tax as tax"` → `"d.tax_dec as taxDec"`, and the row
  type field renamed with it. A field named `tax` must no longer mean "the
  driver's rate", so nobody has to guess which column fed it.
- `DriverPaymentData.tax` (web `_lib/db.ts` and `workTrackers/util.ts`) →
  `taxDec`.
- `WorkTrackersResult.driverTax` keeps its name (it is already not a column
  name) and is sourced from `tax_dec`.

Money amounts that happen to be called `tax` (`calculateFinancialTotals().tax`,
`Events.tax_percent`, QuickBooks tax codes) are unrelated and untouched.

## 4. UI

`src/components/InputPercents.tsx` currently strips every non-digit, so
`14.975` cannot be typed at all. Extracted pure helper
`sanitizePercentInput(raw): { display: string; value: number }`:

- accepts one `.` or `,` (normalised to `.`), at most 3 decimals;
- clamps the numeric value to `0…100`;
- keeps a trailing `.` while typing (`"14."` stays `"14."`, value `14`);
- empty → `0`.

The component also gains an `ariaLabel` prop (the visible "Tax" label is not
wired to the input), which is what the Playwright spec locates it by.

Write sites switched to `tax_dec`:

- `/team/[userUuid]/edit/driver` → `DriverPageContent` / `DriverSection` →
  `useCurrentUserStore.taxDec` → `driverPayFields()` writes `tax_dec`.
- `ensureDriverExists`, `updateDriverPaymentData` (`workTrackers/db/db.ts`).

Read sites switched to `tax_dec`: `useUserById`, `manageTeam/useDrivers`,
`workTrackers` `useDrivers.db`, `useDriversForWeek`, `useWorkTrackersForWeek`,
`getDrivers.db`, `db.ts`, `DriverList` (`Tax: {taxDec}%`),
`WorkTrackerGroupModal`, `fetchDriverTaxById`, `fetchDriverPaymentData`,
`loadUserData`.

## 5. Mobile app (`br_driver`)

- `library/powersync/AppSchema.ts` — add `tax_dec: column.real`.
- `hooks/db/useDriver.ts` — select `tax_dec`, expose `tax_dec: number | null`.
- `features/profile/ProfileScreen.tsx` — Driver information shows
  `driver.tax_dec`.

No other `tax` read exists in that repo.

## 6. Permissions

No role gains or loses an ability — the same people who could edit driver pay
can edit the rate. `permissionPageData.ts` needs no change.

## 7. Tests

| Level      | File                                      | Covers                                                                                           |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| pgTAP      | `supabase/tests/driver_tax_dec.test.sql`  | column type/scale; `14.975` → `tax = 15`; legacy `tax` write back-fills `tax_dec`; `insert` path |
| Vitest     | `src/components/InputPercents.test.ts`    | `sanitizePercentInput` — decimals, 3-place cap, clamp, comma, trailing dot                       |
| Vitest     | `userOperations.test.ts`                  | `driverPayFields` emits `tax_dec` and no `tax`                                                   |
| Vitest     | `workTrackers/util.test.ts`               | `calculateFinancialTotals` with a fractional rate                                                |
| Playwright | `manageTeam/e2e/driver-tax.admin.spec.ts` | typing `14.975` on `/team/{uuid}/edit/driver`, saving, reading it back after a reload            |

The mobile change is a column swap in one `select` and one rendered value, with
no logic of its own; `br_driver`'s existing suite covers the screen around it.

## Edge cases

- **Offline write** — PowerSync queues the `tax_dec` update; the trigger runs
  when it reaches Postgres, so `tax` lags for old clients exactly as long as the
  sync does. Acceptable: `tax` is deprecated.
- **Old client writes `tax`** — covered by the reverse branch of the trigger.
- **Rounding** — `round()` is half-up: `14.5 → 15`, `14.4 → 14`. Old apps see a
  whole percent and are, by design, slightly wrong; that is why they are legacy.
- **Existing rows** — back-filled from `tax`; the `where tax_dec = 0` guard makes
  the migration re-runnable.
