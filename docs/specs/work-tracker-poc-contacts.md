# Spec: Work Tracker — POC as contact select + auto-populate from neighbours

Status: **APPROVED** (2026-08-24, after amendments D4/D5 in §10)
Owner: workTrackers
Surface affected: `WorkTrackerModal` → tab **Details** → columns _Pickup_ / _Dropoff_

Existing assets reused (no rewrite):

- [`SearchableSelect`](src/components/SearchableSelect.tsx) — cmdk-based single select
- [`CreateContactModal`](src/features/companiesContacts/components/CreateContactModal.tsx) +
  [`CreateCompanyModal`](src/features/companiesContacts/components/CreateCompanyModal.tsx) —
  already prop-driven (`{ isOpen, onClose }`), already nest Company inside Contact
- [`useContactsAll`](src/features/companiesContacts/hooks/useContactsAll.ts) — reactive
  PowerSync read with `companyName` join
- [`resolveAddressFull`](src/utils/resolveAddress.ts) /
  [`getExpectedAddressFullForWorkTracker`](src/features/alerts/util/workTrackerTransportation.ts)
  — the shape the new POC resolver mirrors

### Locked decisions (confirmed by owner)

- **D1 — neighbour sources: events _and_ adjacent work trackers.** Same dual-source rule the
  address locate button already uses.
- **D2 — booked events only.** Mirrors the `event_status = 'booked'` filter in
  `resolveAddressFull`.
- **D3 — with a migration.** New FK columns `pickup_poc_contact_uuid` /
  `dropoff_poc_contact_uuid`; the existing `*_poc` text columns stay.
- **D4 — sync rules need no change.** Owner confirmed the PowerSync bucket for `WorkTrackers`
  already covers new columns. No dashboard deploy step.
- **D5 — auto-populate requires a real contact record.** A neighbour whose POC is legacy free
  text is _not_ populatable: the button refuses and tells the user to create a contact. Driving
  reason: the mobile app resolves the POC **phone number** through `Contacts`, and free text
  carries no phone.

### Not reused, and why

The prompt pointed at
`src/features/quotesAndBookings/components/createQuote/modals/NewContactModal.tsx` and
`NewCompanyModal.tsx`. Those read their open-state and write their results straight into
`useCreateQuoteStore` (`isNewContactModalOpen`, `setField("contactName", …)`), so they cannot be
mounted outside the create-quote flow without a refactor of that store contract. The
`companiesContacts` twins listed above are the same UI with a clean prop API and the same
duplicate-detection (`findContactDuplicates`), so this spec reuses those instead. Net change to
them: one optional callback prop. The quotes flow is untouched.

---

## 1. Summary

Two changes to `WorkTrackerModal`, both scoped to the Pickup POC / Dropoff POC fields:

1. **Free-text input → searchable contact select**, with **`+ Add new contact` as the last row
   inside the dropdown**, opening `CreateContactModal` and selecting the new contact on save.
2. **Two locate buttons**, one per POC field:
   - beside **Pickup POC** → the contact of the **previous** event / adjacent work tracker
   - beside **Dropoff POC** → the contact of the **next** event / adjacent work tracker

### Non-goals

- Editing a contact from inside the work tracker modal (select or create only).
- Back-filling `*_contact_uuid` for historical rows from the existing free text.
- Changing how POC renders on the PDF, the Bill of Lading, or `TripList`.

---

## 2. DB schema

### 2.1 Migration

`supabase/migrations/<ts>_work_tracker_poc_contacts.sql`

```sql
alter table public."WorkTrackers"
  add column if not exists pickup_poc_contact_uuid uuid references public."Contacts"(id),
  add column if not exists dropoff_poc_contact_uuid uuid references public."Contacts"(id);
```

Both nullable, no default, no back-fill.

### 2.2 Why keep `pickup_poc` / `dropoff_poc` as text

The text columns are **not** dropped and **not** deprecated. They stay as the denormalised
display value, written alongside the uuid on every selection:

- Four read sites keep working untouched — [PdfComponent.tsx:230](src/features/workTrackers/components/PdfComponent.tsx:230),
  [BillOfLadingDocument.tsx:334](src/features/workTrackers/components/billOfLading/BillOfLadingDocument.tsx:334),
  [TripList.tsx:76](src/features/workTrackers/components/TripList.tsx:76), and the same pair for dropoff.
- The Bill of Lading is a shipping document: the POC name printed on it must reflect the trip as
  dispatched, not follow a later rename of the contact record.
- Rows created before this change keep their free text and stay readable (see §4.3).

**Invariant:** `*_contact_uuid` non-null ⇒ `*_poc` holds that contact's display name at write
time. `*_poc` non-null with a null uuid is legal and means _legacy / unlinked free text_.

### 2.3 PowerSync

- [`WorkTrackersCols`](src/lib/powersync/AppSchema.ts:320) — add
  `pickup_poc_contact_uuid: column.text` and `dropoff_poc_contact_uuid: column.text`
  (uuid syncs as text; `PowerSyncColsFor<"WorkTrackers">` will fail to compile until
  `database.types.ts` is regenerated).
- Run `npm run gtl` after the migration is applied locally.
- **Sync rules: no change needed** (D4). The `WorkTrackers` bucket already covers the new
  columns, confirmed by the owner — no dashboard deploy step in this feature.
- `Contacts` is already synced ([AppSchema.ts:775](src/lib/powersync/AppSchema.ts:775)); `Events.contact_uuid`,
  `event_status`, `event_start` and `deleted` are already in the local `Events` table. No new
  table registration is needed, so the "adding a new table" checklist in
  `POWERSYNC_ARCHITECTURE.md` does not apply.

---

## 3. TypeScript contracts (locked)

### 3.1 Resolver

New file `src/features/workTrackers/util/resolvePocContact.ts`.

```ts
export type PocSource = "event" | "workTracker";

/**
 * Three-state on purpose (D5). `unlinked` is NOT an error and NOT a hit: the neighbour exists
 * and has a POC, but it is legacy free text with no Contacts row — so it carries no phone
 * number and must not be copied forward. The UI turns it into an actionable message.
 */
export type PocResolution =
  | { kind: "contact"; contactUuid: string; displayName: string; source: PocSource }
  | { kind: "unlinked"; displayName: string; source: PocSource }
  | null;

/** Shapes fed by the PS query; kept dumb so the picker is unit-testable. */
export type PocEventRow = {
  booked: boolean;
  eventStart: string;
  contactUuid: string;
  displayName: string;
};

export type PocWorkTrackerRow = {
  date: string | null;
  pickupPoc: string | null;
  pickupPocContactUuid: string | null;
  pickupPocDisplayName: string | null;
  dropoffPoc: string | null;
  dropoffPocContactUuid: string | null;
  dropoffPocDisplayName: string | null;
};

/** Pure — the unit-tested core. */
export function resolvePocContact(
  source: { events: PocEventRow[]; workTrackers: PocWorkTrackerRow[] },
  targetDate: string,
  direction: "past" | "future",
): PocResolution;
```

Data-access wrapper in the same file:

```ts
export async function getExpectedPocForWorkTracker(params: {
  bleacherUuid: string;
  targetDate: string;
  excludeWorkTrackerUuid?: string | null;
  direction?: "past" | "future"; // default "past"
}): Promise<PocResolution>;
```

### 3.2 Component props

New file `src/features/workTrackers/components/PocSelect.tsx`.

```ts
type PocSelectProps = {
  contactUuid: string | null;
  /** Legacy/denormalised text; shown when contactUuid is null. */
  pocText: string | null;
  onChange: (next: { contactUuid: string | null; pocText: string | null }) => void;
  placeholder: string;
  disabled?: boolean;
};
```

### 3.3 Additive props on reused components

```ts
// SearchableSelect — rendered as a pinned last row, never filtered by the search box.
footerItem?: { label: string; onSelect: () => void };

// CreateContactModal — fires after a successful insert, before onClose.
onCreated?: (contactId: string) => void;
```

Both optional; every existing call site compiles unchanged.

### 3.4 Snapshot type

[`WorkTrackerSnapshot`](src/features/workTrackers/util/workTrackerEditPolicy.ts:27) gains
`pickup_poc_contact_uuid: string | null` and `dropoff_poc_contact_uuid: string | null`.

---

## 4. Behaviour

### 4.1 The select

- Options come from `useContactsAll()`.
  - `label`: `` `${firstName} ${lastName}`.trim() `` + `` ` — ${email}` `` when an email exists.
  - `searchValue`: `email` + `phone` + `companyName`, so a contact is findable by company.
- Selecting a contact writes **both** fields in one `setWorkTracker` update:
  `*_contact_uuid = contact.id`, `*_poc = displayName` (label without the email suffix).
- The `X` clear affordance already built into `SearchableSelect` sets **both** to `null`.
- The whole Details tab sits inside `<fieldset disabled={!canEditFields}>`
  ([WorkTrackerModal.tsx:824](src/features/workTrackers/components/WorkTrackerModal.tsx:824)); the select's trigger is a
  `<button>`, so it is disabled natively — no extra guard needed.

### 4.2 `+ Add new contact`

- Rendered via the new `footerItem` prop: a separate `CommandGroup` after the options, with a
  `border-t`, **not** filtered by the search query (it must stay reachable when the search returns
  nothing — which is exactly when it is most needed).
- On select: close the popover, open `CreateContactModal` from local `useState` in
  `WorkTrackerModal`, remembering which field asked (`"pickup" | "dropoff" | null`).
- `onCreated(contactId)` → apply that contact to the remembered field, then `onClose()`.
- Cancel leaves the field exactly as it was.
- **Nesting:** this is a Radix `Dialog` inside the work tracker `Dialog`. `CreateContactModal`
  already nests `CreateCompanyModal` inside itself, so the pattern is proven in this codebase;
  the acceptance test in §6 pins the one behaviour that could regress — closing the inner dialog
  must not close the work tracker.

### 4.3 Legacy rows

When `*_contact_uuid` is null and `*_poc` has text, the trigger shows that text (greyed, in the
selected-value slot) instead of the placeholder. It is **not** injected into the option list.
Picking any contact overwrites it. No migration of these values, no warning banner.

### 4.4 Auto-populate buttons

Icon `LocateFixed`, wrapped in `AppTooltip`, rendered under `{canEditFields && …}` — identical
treatment to the address locate buttons at
[WorkTrackerModal.tsx:1049](src/features/workTrackers/components/WorkTrackerModal.tsx:1049) and
[:1125](src/features/workTrackers/components/WorkTrackerModal.tsx:1125), so the two POC rows read as
siblings of the two address rows.

| Field       | Tooltip                                | Direction |
| ----------- | -------------------------------------- | --------- |
| Pickup POC  | `Populate from previous event contact` | `past`    |
| Dropoff POC | `Populate from next event contact`     | `future`  |

Both no-op when `bleacher_uuid` or `date` is missing (same guard as the address handlers).

The three resolver outcomes map to three distinct UI results:

| `PocResolution`        | Result                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ kind: "contact" }`  | Applied through the same `onChange` path as a manual pick, so the uuid/text invariant of §2.2 holds.                                                                                                           |
| `{ kind: "unlinked" }` | **Field untouched.** `createErrorToast(["Cannot populate from the previous event.", "Its POC (\"<displayName>\") is free text with no contact record. Create a contact for it first."])` — resp. _next event_. |
| `null`                 | Field untouched. `createErrorToast(["No contact found on the previous event."])` — resp. _next event_.                                                                                                         |

The `unlinked` case is deliberately **not** silently skipped in favour of an older neighbour: the
nearest neighbour is the semantically correct POC, and quietly substituting a more distant one
would populate a _wrong_ contact — worse than populating none.

> Deliberate divergence from the address buttons: those fail **silently** when nothing resolves,
> which reads as a broken button. Flagging it rather than copying it. Say the word and I will
> match the silent behaviour instead.

### 4.5 Resolution algorithm

Mirrors `resolveAddressFull` exactly, including its inclusive date bounds and its tie-break.

**Candidate events** — `BleacherEvents` → `Events` → `Contacts`, filtered to
`bleacher_uuid = ?`, `e.deleted = 0`, `e.event_status = 'booked'` (D2), `e.contact_uuid not null`,
`c.deleted = 0`.

**Candidate work trackers** — same `bleacher_uuid`, excluding the current one via
`excludeWorkTrackerUuid`.

| direction          | event picked                          | work tracker picked            | POC column read             |
| ------------------ | ------------------------------------- | ------------------------------ | --------------------------- |
| `past` (Pickup)    | latest `event_start` ≤ `targetDate`   | latest `date` ≤ `targetDate`   | neighbour's **dropoff** POC |
| `future` (Dropoff) | earliest `event_start` ≥ `targetDate` | earliest `date` ≥ `targetDate` | neighbour's **pickup** POC  |

The "read the opposite end of the neighbour" rule is the same one `resolveAddressFull` uses for
addresses: where the bleacher was dropped off is where this trip picks it up.

**Tie-break:** the candidate nearer `targetDate` wins; **on an equal date the event wins**
(`past`: `bestEventDate >= bestWtDate`; `future`: `bestEventDate <= bestWtDate`).

**Work tracker candidate validity (D5):** a neighbour qualifies for _selection_ if its relevant
POC has **either** a `*_poc_contact_uuid` **or** non-empty `*_poc` text — text-only rows still
compete for "nearest", they just cannot be applied. Once a winner is chosen:

- winner has `*_poc_contact_uuid` → `{ kind: "contact", … }`
- winner has text only → `{ kind: "unlinked", displayName: <that text>, … }`

Selection and applicability are kept separate on purpose. If text-only rows were filtered out
during selection, the button would silently reach past the true neighbour and fill in an older,
wrong contact.

Events cannot produce `unlinked`: the query already requires `e.contact_uuid not null`, so any
event that reaches the picker has a real `Contacts` row.

`event_start` is an ISO timestamp and `WorkTrackers.date` / `targetDate` are ISO dates, so events
are normalised with `DateTime.fromISO(...).toISODate()` before comparison — same as
`resolveAddressFull`.

---

## 5. Write path

`wtFields` in [saveWorkTracker](src/features/dashboard/db/client/db.ts:390) gains
`pickup_poc_contact_uuid` and `dropoff_poc_contact_uuid` (they sit inside the shared object, so
insert and update both pick them up).

`buildWorkTrackerSnapshot` and `hasUnacceptFieldChanges`
([workTrackerEditPolicy.ts](src/features/workTrackers/util/workTrackerEditPolicy.ts:113)) gain the two uuid
fields. POC changes already force **un-accept** (the driver must re-accept a trip whose contact
moved); comparing only the text would miss a swap between two contacts sharing a display name.

New-work-tracker fixtures need the two keys or `Tables<"WorkTrackers">` stops type-checking:
[dashboard/page.tsx:72](src/app/dashboard/page.tsx:72),
[CellEditor.tsx:178](src/features/dashboard/components/CellEditor.tsx:178), and
[workTrackerEditPolicy.test.ts:18](src/features/workTrackers/util/workTrackerEditPolicy.test.ts:18).

---

## 6. Test plan

### Unit (Vitest) — `resolvePocContact.test.ts`, TDD, written first

1. `past` picks the latest booked event ≤ target; `future` picks the earliest ≥ target.
2. Non-booked and `deleted = 1` events are ignored (D2).
3. Work tracker neighbour wins when strictly nearer than any event.
4. **Equal dates → event wins**, both directions.
5. `past` reads the neighbour's `dropoff_poc*`; `future` reads its `pickup_poc*` (asserted by
   giving the two ends different contacts).
6. `excludeWorkTrackerUuid` keeps a tracker from resolving against itself.
7. Legacy neighbour (text, no uuid) wins on distance → `{ kind: "unlinked" }` carrying that
   text — and specifically **not** the linked contact of a more distant neighbour (D5).
8. A neighbour with no POC at all is skipped entirely, and a further linked one wins.
9. Nothing on either side → `null`.

### Component (Vitest) — **not written; infrastructure absent**

Vitest here runs on `environment: "node"` with no `@testing-library/react` and no jsdom; the repo
states the omission deliberately (`useQuoteActivityTracker.test.ts`: _"direct hook tests would
require @testing-library/react which is not in this project"_). Adding that stack is its own
decision, not a side effect of this feature.

Instead the component logic was **extracted into pure functions** and unit-tested at that seam —
`src/features/workTrackers/util/pocField.ts` (`buildPocContactOptions`, `contactDisplayName`,
`resolvePocTriggerLabel`, `describePocPopulateResult`), 14 tests. `PocSelect.tsx` and the
`SearchableSelect` footer row are left as thin rendering over tested logic.

### E2E (Playwright) — **skipped, owner's call**

`supabase/seed.sql` does not carry the test accounts the Clerk auth setup signs in as, so the
suite cannot authenticate. Skipped on the owner's instruction rather than worked around.

When the accounts land, the intended coverage is:

- Open a work tracker → Pickup POC is a combobox → search by company name → pick → save →
  reopen → value persisted.
- `+ Add new contact` → inner dialog opens → save → new contact selected **and the work tracker
  modal still open** (the nested-dialog regression from §4.2).
- Bleacher with a booked event before and after the tracker's date → both locate buttons fill
  the expected contact.
- Nearest neighbour holding legacy free text → locate refuses with the toast, and does **not**
  substitute the more distant linked contact (D5).

The route to use is `/work-trackers/[startDate]/[userUuid]`, not the dashboard: it opens the same
modal from a plain DOM table, whereas the dashboard grid is a PixiJS canvas the existing suite
deliberately does not drive.

### Definition of Done

`npm run tc`, `npm run test`, `npm run lint` — green. `npm run test:e2e` — skipped, see above.

---

## 7. Edge cases

| Case                                              | Behaviour                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Contact soft-deleted after being set on a tracker | Falls out of the option list; the trigger keeps showing `*_poc` text via the §4.3 path. No data loss, no error.                          |
| PowerSync offline                                 | `useContactsAll` serves the local DB; select and both locate buttons work fully offline. `createContact` writes locally and syncs later. |
| Contact created offline, then selected            | Works — the local row has its uuid immediately.                                                                                          |
| No bleacher or no date on the tracker             | Locate buttons no-op (guard mirrors the address handlers).                                                                               |
| Bleacher has neighbours but none carry a POC      | `null` → "No contact found" toast, field untouched.                                                                                      |
| Nearest neighbour's POC is legacy free text       | `unlinked` → "create a contact for it first" toast, field untouched (D5). The older linked neighbour is **not** substituted.             |
| Non-editable tracker (`!canEditFields`)           | `fieldset` disables the select; the buttons are not rendered at all.                                                                     |
| Contact with no last name                         | Label is the first name; the invariant in §2.2 is unaffected.                                                                            |
| Two contacts, same display name                   | Distinguished by the `— email` label suffix and by uuid in the snapshot diff (§5).                                                       |

---

## 8. Work breakdown

| #   | File                                                                                                                        | Change                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `supabase/migrations/<ts>_work_tracker_poc_contacts.sql`                                                                    | new                                                   |
| 2   | `database.types.ts`                                                                                                         | `npm run gtl`                                         |
| 3   | [AppSchema.ts](src/lib/powersync/AppSchema.ts:320)                                                                          | +2 columns                                            |
| 4   | `workTrackers/util/resolvePocContact.ts` + `.test.ts`                                                                       | new, TDD                                              |
| 5   | [SearchableSelect.tsx](src/components/SearchableSelect.tsx)                                                                 | optional `footerItem`                                 |
| 6   | [CreateContactModal.tsx](src/features/companiesContacts/components/CreateContactModal.tsx)                                  | optional `onCreated`                                  |
| 7   | `workTrackers/components/PocSelect.tsx`                                                                                     | new                                                   |
| 8   | [WorkTrackerModal.tsx](src/features/workTrackers/components/WorkTrackerModal.tsx)                                           | 2 inputs → `PocSelect`, 2 locate buttons, modal state |
| 9   | [dashboard/db/client/db.ts](src/features/dashboard/db/client/db.ts:390)                                                     | `wtFields`                                            |
| 10  | [workTrackerEditPolicy.ts](src/features/workTrackers/util/workTrackerEditPolicy.ts) + test                                  | snapshot + un-accept diff                             |
| 11  | [dashboard/page.tsx](src/app/dashboard/page.tsx:72), [CellEditor.tsx](src/features/dashboard/components/CellEditor.tsx:178) | new-tracker fixtures                                  |
| 12  | `supabase/seed.sql` + e2e spec                                                                                              | E2E fixtures                                          |

Suggested commit split: **1–3** (schema), **4** (resolver + tests), **5–7** (reusable UI),
**8–11** (wiring), **12** (e2e).

---

## 9. Open items

None blocking. One judgement call awaiting a veto: the error toast on an empty locate result
(§4.4), which diverges from the silent address buttons.

## 10. Amendments after review

- **D4** — sync-rules step removed from §2.3 and from the work breakdown.
- **D5** — a legacy free-text neighbour no longer populates. §3.1 gained the three-state
  `PocResolution`, §4.4 gained the outcome table, §4.5 split _selection_ from _applicability_,
  §6 gained unit tests 7–8 and an E2E case, §7 gained a row.
