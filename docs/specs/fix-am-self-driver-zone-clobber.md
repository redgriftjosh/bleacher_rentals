# Fix: AM's own new Driver-zone assignment silently lost on save

## Status
Draft — awaiting approval.

## Bug report

A user who is **only an Account Manager (AM)**, assigned to one or more zones,
opens their own record at `team/[uuid]/edit/basic-user-info`, clicks
**Add role → Driver**. That part works — the Driver role is added.

They then go to `team/[uuid]/edit/driver`, pick a zone for themselves as a
driver, and save. The page reloads with `200 OK`, the "User updated
successfully" toast fires, but the zone assignment is **not** persisted — the
driver has no zone after save.

## Root cause (confirmed by code read)

File: [src/features/manageTeam/db/userOperations.ts](../../src/features/manageTeam/db/userOperations.ts)

`updateUser()` processes roles sequentially in one function call, and for a
user who is **both** Driver and Account Manager, it runs two independent
writes to the same `DriverZones` table, back to back, driven by two different
pieces of client state that are never reconciled with each other:

1. **Driver block** (new driver row path, [userOperations.ts:301-323](../../src/features/manageTeam/db/userOperations.ts#L301-L323)):
   inserts the new `Drivers` row, then calls
   `syncDriverZoneAssignments(supabase, newDriverId, state.assignedDriverZoneUuids)`
   ([userOperations.ts:471-536](../../src/features/manageTeam/db/userOperations.ts#L471-L536)).
   This correctly diffs and **inserts** the `DriverZones` row for the zone the
   user just picked on the Driver tab (`assignedDriverZoneUuids`, owned by
   `SelectDriverZones` on `DriverPageContent.tsx`).

2. **Account Manager block**, which runs right after because `state.isAccountManager`
   is still `true` ([userOperations.ts:342-378](../../src/features/manageTeam/db/userOperations.ts#L342-L378)),
   ends with:
   ```ts
   await syncDriverZonesForAm(supabase, state.zoneDriverMap);
   ```
   `syncDriverZonesForAm` ([userOperations.ts:538-550](../../src/features/manageTeam/db/userOperations.ts#L538-L550))
   is a **full delete+reinsert per zone**:
   ```ts
   for (const [zoneId, driverUuids] of Object.entries(zoneDriverMap)) {
     await supabase.from("DriverZones").delete().eq("zone_uuid", zoneId);
     if (driverUuids.length > 0) insert(driverUuids for zoneId);
   }
   ```
   `state.zoneDriverMap` is populated **once, at page load**, by
   `fetchUserById` ([userOperations.ts:722-735](../../src/features/manageTeam/db/userOperations.ts#L722-L735))
   from the driver-per-zone snapshot that existed **before** the user added
   their own Driver role. It is only ever mutated by the "assign drivers to
   zone" grid on the Account Manager tab
   (`AccountManagerPageContent.tsx:45-54`) — never by the Driver tab's zone
   picker. The two fields are independent Zustand state, both submitted in
   the same form, never merged.

**Sequence:**
1. Page loads → `zoneDriverMap` snapshot captured (does not include "self" —
   they weren't a driver yet).
2. User adds Driver role, picks a zone on the Driver tab →
   `assignedDriverZoneUuids` set.
3. Save → Driver block inserts `Drivers` row + correct `DriverZones` row for
   (self, zone).
4. Immediately after, AM block runs `syncDriverZonesForAm(zoneDriverMap)` for
   that same zone → **deletes all `DriverZones` rows for the zone** and
   reinserts only the stale list, which does not include the user's own new
   driver id.
5. Net effect: step 3's insert is clobbered by step 4. Both Supabase calls
   succeed (RLS permits both — the AM manages that zone), no error is thrown
   or logged, `updateUser` returns `{ success: true }`. Matches the reported
   symptom exactly (clean `200`, no console error, data doesn't persist).

This reproduces for **any** driver whose zone changed in the same submit
where an AM also has zone-scoped drivers in `zoneDriverMap` for that zone —
it's not exclusive to self-assignment, but self-assignment (add Driver role +
zone in one visit) is the common trigger because it's the only path that
creates a *new* `DriverZones` row that `zoneDriverMap` couldn't possibly know
about yet.

Confirmed **not** an RLS or permissions bug — `supabase/migrations/20260730140000_driver_zones_am_rls.sql`
policies correctly allow both writes; the bug is pure write-ordering /
stale-state clobber in application code.

## Fix approach

Two complementary changes:

### A. Stop `syncDriverZonesForAm` from clobbering zones it didn't touch this submit for drivers it doesn't know about

Reframe `syncDriverZonesForAm` to be **diff-based per zone**, using the same
add/remove approach as `syncDriverZoneAssignments`, instead of
delete-all-then-reinsert:
- For each zone in `zoneDriverMap`, compute the diff between existing
  `DriverZones` rows for that zone and the desired `driverUuids` list, and
  only delete rows for drivers being *removed* and insert rows for drivers
  being *added* — never touch rows for drivers not mentioned in the diff
  because they aren't part of the AM-grid state to begin with... **but** this
  alone doesn't fix it, because the AM grid's `driverUuids` list for a zone
  legitimately does NOT include the self-driver (state was snapshotted
  before). A pure diff still removes "self" because "self" isn't in the
  desired list.

  → Need something better than a diff of the same shape. See option B.

### B. Reconcile `assignedDriverZoneUuids` (Driver tab) into `zoneDriverMap` (AM tab) before submit — the real fix

Root problem is **stale state**, not the SQL pattern. Fix at the state layer:
before `updateUser` runs `syncDriverZonesForAm`, make sure `zoneDriverMap`
reflects the driver-zone edits that just happened in the Driver tab of the
*same* submit for the *same* user.

Concretely, in `updateUser` (and `createUser`, which has the identical
pattern at lines 190-213), immediately before calling `syncDriverZonesForAm`:
- Determine the driver id being saved this submit (`existingDriver.id` or
  `newDriverId`).
- For each zone uuid in `state.assignedDriverZoneUuids`: ensure that driver
  id is present in `zoneDriverMap[zoneUuid]` (add it if missing).
- For each zone uuid that used to be assigned to this driver but is not in
  `assignedDriverZoneUuids` anymore (i.e. removed on the Driver tab): remove
  the driver id from `zoneDriverMap[zoneUuid]` if present.

This makes `syncDriverZonesForAm` operate on a `zoneDriverMap` that already
agrees with what `syncDriverZoneAssignments` just wrote, so the
delete+reinsert reproduces the same end state instead of clobbering it.

Order of operations stays: driver block (incl. `syncDriverZoneAssignments`)
runs first, reconciliation happens, then AM block's
`syncDriverZonesForAm` runs last and is now consistent.

### C. Guard against future recurrence: assert consistency (optional, cheap)

After both blocks finish, in dev/test only, we could assert that querying
`DriverZones` for the driver id matches `assignedDriverZoneUuids` — but this
adds a network round trip on every save; likely just cover it with a unit
test on the merge function instead (see Tests).

## Scope of change

- `src/features/manageTeam/db/userOperations.ts`:
  - `updateUser` — add reconciliation step between the Driver block and the
    `syncDriverZonesForAm` call.
  - `createUser` — same reconciliation, since it has the identical
    `updateDriverAssignments` + `syncDriverZonesForAm` sequence for the
    "AM creates themself + is also a driver" case (lines 190-213), though
    `createUser` currently doesn't even run a Driver block before it — check
    whether `createUser` handles `state.isDriver` at all; if not, this may be
    out of scope for create (need to verify before finalizing spec).
  - New small pure helper, e.g. `reconcileZoneDriverMap(zoneDriverMap,
    driverUuid, assignedZoneUuids, previousZoneUuids)` in
    `src/features/manageTeam/logic/driverZoneAssignments.ts` (next to the
    existing `computeDriverZoneAssignmentChanges`) — pure function, easy to
    unit test in isolation, mirrors the existing pattern in that file.
- No DB schema change, no RLS change, no PowerSync sync-rules change (this
  write path goes through the Supabase JS client directly, not PowerSync).

## Open questions before implementation (need answers or explicit "use your best judgment")

1. Does `createUser` need the same fix, or is "new user, AM + driver at
   creation time" not a real flow today? (Will verify by reading
   `createUser` fully before implementing — may turn out `state.isDriver` is
   not handled at all in `createUser`, making this a non-issue there.)
2. Should the reconciliation also handle the reverse direction — i.e. if the
   AM's grid (Account Manager tab) assigns *a different* driver to a zone in
   the same submit where that same driver's own Driver-tab zone list would
   otherwise disagree? (Edge case: two conflicting edits to the same
   driver-zone pair in one submit — out of scope unless you want it covered.)
3. OK to add the pure helper to `src/features/manageTeam/logic/driverZoneAssignments.ts`
   alongside `computeDriverZoneAssignmentChanges`, or prefer it inlined in
   `userOperations.ts`?

## Test plan (TDD — write first)

### Unit tests (Vitest)
`src/features/manageTeam/logic/driverZoneAssignments.test.ts` (extend
existing file if present):
- `reconcileZoneDriverMap` adds the driver id into the map for each newly
  assigned zone uuid, without touching other zones' driver lists.
- `reconcileZoneDriverMap` removes the driver id from the map for zones that
  were unassigned this submit.
- `reconcileZoneDriverMap` is a no-op when `assignedZoneUuids` already
  matches what's in the map.
- `reconcileZoneDriverMap` does not mutate the input map (returns a new one)
  — keep it pure, consistent with `computeDriverZoneAssignmentChanges`.

### Integration/DB-level test (Vitest against local Supabase, matching existing
patterns in this repo — check for existing `userOperations`-level tests first)
- Given: an AM (not admin) managing zone Z, with an existing driver D2
  already assigned to Z (in `zoneDriverMap`).
- When: the AM adds Driver role to themself, assigns zone Z on the Driver
  tab, and calls `updateUser`.
- Then: after `updateUser` resolves, `DriverZones` contains rows for
  **both** the AM's own new driver id and D2 for zone Z (D2 must not be
  dropped either — this also validates the fix doesn't regress the AM-grid
  write).

### E2E (Playwright, `*.am.spec.ts` — runs as Account Manager role per
existing seed data in `supabase/seed.sql`)
- Log in as an AM seeded with a managed zone.
- Navigate to own `team/[uuid]/edit/basic-user-info`, add Driver role, save.
- Navigate to `team/[uuid]/edit/driver`, select the managed zone, save.
- Reload the page (or refetch) and assert the zone chip/selection is present
  — i.e. assert against actual persisted state, not optimistic UI.

## Definition of done
Per CLAUDE.md: `npm run tc`, `npm run test`, `npm run lint` all green;
`npm run test:e2e -- --project=am` green for the new spec; final report
posted with real command output.

---

**Please review and reply "Approved" (or request changes) before
implementation starts.** In particular, flag if you have an answer for open
questions 1–3 above, or if I should just proceed with reasonable defaults
(create-flow fix included defensively if `isDriver` is handled there;
reverse-direction edge case out of scope; helper placed in
`driverZoneAssignments.ts`).
