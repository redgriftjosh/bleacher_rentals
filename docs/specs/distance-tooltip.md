# Spec: Distance Tooltip (Dashboard)

Status: **Approved & implemented** (defaults from §9 accepted)
Owner: dashboard
Related existing feature: **Address Tooltip** (`showAddressTooltip`)

---

## 1. Summary

Add a **Distance Tooltip** to the dashboard grid, mirroring the existing **Address
Tooltip**. When enabled, hovering a bleacher cell shows the driving distance between
that bleacher's **last location** (most recent event / drop‑off on or before the
hovered date) and its **next location** (earliest event / drop‑off strictly after the
hovered date).

Display format (already produced by `/api/distance`):

```
264.8 mi (426.1 km)
```

Toggled on/off from the **Options** menu, exactly like "Show Address Tooltip".

### Mutual exclusivity (hard requirement)

- Address Tooltip and Distance Tooltip **cannot both be ON**.
- Enabling one **auto‑disables** the other.
- **Both OFF** is a valid state (no tooltip shown).

---

## 2. Reuse & Clean-Code direction

The two tooltips share ~everything except *what text to compute per cell*. We refactor
toward one shared mechanism instead of duplicating the Address Tooltip.

Reused as‑is (no changes needed):

| Concern | Existing asset |
| --- | --- |
| Distance number + `"mi (km)"` formatting | `src/app/api/distance/route.ts` → returns `distanceText` |
| Distance fetch + caching | react-query key `["gmaps-distance", origin, dest]` (already used by `WorkTrackerModal`) |
| "last location" resolution | `resolveAddress(bleacher, date)` in `src/utils/resolveAddress.ts` |
| Cell hit-testing on hover | `Dashboard.updateAddressTooltip()` in `src/features/dashboard/Dashboard.ts` |
| Persisted per-user options | `DashboardFilterSettings` + `useDashboardFilterSettings` |

Extended minimally:

- `resolveAddress` gains a `direction: "past" | "future"` param (default `"past"`,
  keeps current behavior). `"future"` returns the **earliest** event/drop‑off address
  **strictly after** the target date. No new fields in the dashboard bleacher shape are
  required — we reuse the same `bleacherEvents[].address` / `workTrackers[].dropoffAddress`.

Generalized (shared shell):

- The single tooltip store + single render component handle both kinds via a
  discriminated union. Because the two modes are mutually exclusive, one store / one
  mounted component is sufficient and is the cleanest shared abstraction.

---

## 3. Data / Schema

### 3.1 Supabase migration (new column)

New file `supabase/migrations/<timestamp>_distance_tooltip_option.sql`:

```sql
ALTER TABLE "DashboardFilterSettings"
  ADD COLUMN show_distance_tooltip boolean NOT NULL DEFAULT false;
```

(Mirrors `20260402185109_address_tooltip_option.sql`.)

### 3.2 PowerSync `AppSchema.ts`

In `DashboardFilterSettingsCols` add:

```ts
show_distance_tooltip: column.integer, // 0 / 1 locally
```

### 3.3 Type regeneration

Run `npm run gtl` after the migration so `database.types.ts` picks up the column.

### 3.4 Seed (optional)

`supabase/seed.sql` — if it explicitly lists `DashboardFilterSettings` columns, add
`show_distance_tooltip` default `false`. Otherwise no change. (Verify during impl;
`npx supabase db reset` if seed users change.)

---

## 4. TypeScript types (locked contract)

### 4.1 Filter state — `src/features/dashboardOptions/types.ts`

```ts
export type DashboardFilterState = {
  // ...existing...
  showAddressTooltip: boolean;
  showDistanceTooltip: boolean; // NEW
  // ...existing...
};
```

### 4.2 Settings row + mapping — `useDashboardFilterSettings.ts`

- `SettingsRow`: add `showDistanceTooltip: number | null`.
- `compiledSettings` select: add `"s.show_distance_tooltip as showDistanceTooltip"`.
- `state` memo: add `showDistanceTooltip: toBool(settingsRow.showDistanceTooltip)`.
- Insert defaults: add `show_distance_tooltip: 0`.
- `setField` switch: add
  `case "showDistanceTooltip": return updateDb({ show_distance_tooltip: value ? 1 : 0 });`

### 4.3 Shared tooltip store — `src/features/dashboard/state/useTooltipStore.ts`

`useAddressTooltipStore` is generalized (renamed) into a discriminated store:

```ts
export type TooltipContent =
  | { kind: "address"; text: string }
  | { kind: "distance"; origin: string; dest: string };

type TooltipState = {
  content: TooltipContent | null;
  x: number;
  y: number;
  show: (content: TooltipContent, x: number, y: number) => void;
  hide: () => void;
};
```

> `origin`/`dest` are the resolved address strings; the distance number is fetched
> lazily by the render component (react-query), so the imperative Pixi layer stays
> synchronous and does not fire network calls itself.

### 4.4 `resolveAddress` — `src/utils/resolveAddress.ts`

```ts
export function resolveAddress(
  bleacher: AddressResolvableBleacher,
  targetDate: string,
  direction: "past" | "future" = "past",
): string | null
```

- `past` — latest booked event / latest drop‑off with date `<= targetDate` (current logic).
- `future` — earliest booked event / earliest drop‑off with date `> targetDate`.
- Same-date tie → prefer event (consistent with existing rule).

---

## 5. Components / control flow

### 5.1 `DashboardOptions.tsx` — Options menu

Add a second checkbox item under "Show Address Tooltip":

```
[x] Show Address Tooltip     (mutually exclusive)
[x] Show Distance Tooltip    (mutually exclusive)
```

Handlers enforce mutual exclusivity:

- Enable Address ⇒ `setField("showAddressTooltip", true)` **and**
  `setField("showDistanceTooltip", false)`.
- Enable Distance ⇒ `setField("showDistanceTooltip", true)` **and**
  `setField("showAddressTooltip", false)`.
- Disable either ⇒ just set that one to `false`.

(Two `setField` calls are fine; each is one column update.)

### 5.2 Tooltip render component — `TooltipRenderer` (replaces `AddressTooltip`)

- Reads `content`, `x`, `y` from the shared store.
- Extracts the positioning shell (fixed box + right‑edge flip) into a small
  `TooltipBox` presentational component reused by both kinds.
- `kind: "address"` → render `text`.
- `kind: "distance"` → `useQuery(["gmaps-distance", origin, dest], …/api/distance…)`;
  render states:
  - loading → `"Calculating…"`
  - success → `data.distanceText` (e.g. `264.8 mi (426.1 km)`)
  - error / no route → `"Distance unavailable"`
- Mounted once in `src/app/dashboard/page.tsx` (replaces `<AddressTooltip />`).

### 5.3 `Dashboard.ts` — hover resolution

- Default `filters` object (constructor) and any `DashboardFilterState` construction:
  add `showDistanceTooltip: false`.
- Rename `updateAddressTooltip()` → `updateTooltip()`; generalize:
  - Active mode: Address if `showAddressTooltip`, Distance if `showDistanceTooltip`,
    else hide (guarded even though UI enforces exclusivity).
  - Gate remains `yAxis === "Bleachers"`.
  - Reuse existing cell hit-test (row/col from mouse + scroll).
  - **Only re-resolve on cell change** (existing optimization) — essential so moving
    within a cell does not thrash react-query keys.
  - Address mode → `resolveAddress(bleacher, date, "past")` → `show({kind:"address", …})`.
  - Distance mode → `origin = resolveAddress(bleacher, date, "past")`,
    `dest = resolveAddress(bleacher, date, "future")`; if **both** present →
    `show({kind:"distance", origin, dest, …})`; else `hide()`.
- `useAddressTooltipStore` references (getState().hide() / .show()) point at the
  generalized store.

---

## 6. User behavior scenarios (Playwright — `*.admin.spec.ts` / default)

1. **Toggle on/off**: open Options → enable "Show Distance Tooltip" → checkbox checked
   and persists across reload (row written to `DashboardFilterSettings`).
2. **Mutual exclusivity A→D**: Address ON. Enable Distance ⇒ Address becomes OFF,
   Distance ON.
3. **Mutual exclusivity D→A**: Distance ON. Enable Address ⇒ Distance becomes OFF,
   Address ON.
4. **Both off**: disable the active one ⇒ neither checked, no tooltip on hover.
5. **Hover shows distance**: with Distance ON and Y‑Axis = Bleachers, hover a cell that
   has both a prior and a following location ⇒ tooltip text matches
   `/^\d+(\.\d+)? mi \(\d+(\.\d+)? km\)$/` (mock/stub `/api/distance`).
6. **Hover with only one side** (no next location) ⇒ no tooltip.
7. **Y‑Axis = Events** ⇒ distance tooltip never shows (same gate as address).

> Unit tests (Vitest): `resolveAddress` `"future"` direction (earliest > target, event
> vs drop‑off tie, none found → null); mutual‑exclusion reducer/handler logic.

---

## 7. Edge cases & error handling

- **No next / no last location** → no distance → hide tooltip (don't call the API).
- **Same address on both sides** → API returns `0.0 mi (0.0 km)`; display as‑is.
- **`/api/distance` failure / no route** → `"Distance unavailable"`; never throw into Pixi.
- **Clerk unauthenticated** → `/api/distance` returns 401; component shows
  `"Distance unavailable"`.
- **PowerSync offline** → address resolution is fully local (works offline); the
  distance API is online‑only. Offline distance mode shows `"Distance unavailable"`.
  (Acceptable per architecture: distance is inherently an online lookup.)
- **Rapid hovering** → guarded by cell-change memo + react-query cache; each unique
  origin/dest fetched once and cached (shared with WorkTrackerModal).
- **Booleans stored as 0/1** locally — mind `number | null` on reads (per CLAUDE.md).

---

## 8. Out of scope

- Distance based on live GPS device location (uses scheduled event/WT addresses only).
- Distances for the Events Y‑Axis.
- Any change to the `/api/distance` route or its response shape.

---

## 9. Open questions (decide before / during impl)

1. **"Next location" source** — spec uses the **same** event/drop‑off addresses as the
   past resolver (no data-plumbing change). Alternative: use work‑tracker **pickup**
   address for "future" (requires adding `pickup_address_uuid` to `usePsWorkTrackers`,
   mapping, and `BleacherWorkTracker`). Default = the simpler reuse. Confirm.
2. **Store rename** — rename `useAddressTooltipStore`→`useTooltipStore` (cleaner) vs
   keep the old filename to minimize churn. Default = rename.
3. **Copy** — exact menu label "Show Distance Tooltip" and its `title=` tooltip text.

---

## 10. Definition of Done

- `npm run tc`, `npm run test`, `npm run lint` green.
- `npm run test:e2e` for the toggle + mutual-exclusion + hover paths.
- `npm run gtl` run after the migration; `AppSchema.ts` updated.
- Final report table with real command output (per CLAUDE.md).
