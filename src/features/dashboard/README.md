# Dashboard

PixiJS-powered bleacher scheduling grid. Renders a scrollable matrix of bleachers (rows) x dates (columns) showing events, work trackers, blocks, maintenance events, and damage reports.

## Data Architecture

Data flows from PowerSync's local SQLite database through React hooks, into Zustand stores, and finally into the PixiJS rendering class.

```
PowerSync local SQLite
  |
  v
Per-table React hooks (db/hooks/tables/*.ts)
  |  Each hook watches a single table (or small join).
  |  PowerSync re-fires the query automatically when that table changes.
  |
  v
Assembler hooks (db/hooks/useBleachers.ts, useEvents.ts)
  |  Import all per-table hooks, groupBy bleacher/event UUID,
  |  and assemble the final Bleacher[] / DashboardEvent[] in a useMemo.
  |
  v
useDashboardData.ts
  |  Calls useBleachers() + useEvents().
  |  Writes results into Zustand stores as a side effect during render.
  |
  v
Zustand stores (state/useDashboardBleachersStore, useDashboardEventsStore)
  |
  v
Dashboard.ts (PixiJS class)
  |  Subscribes to Zustand stores via .subscribe().
  |  On change -> scheduleRecompute() -> recompute() -> rebuildGrids().
```

### Why Zustand sits between React and PixiJS

`Dashboard.ts` is a plain TypeScript class, not a React component. It cannot use React hooks (including PowerSync's `useQuery`). The Zustand stores act as the bridge: React hooks write data into them, and the Dashboard class subscribes to changes via `store.subscribe()`.

### Per-table query split

The queries are intentionally split into separate hooks per table group rather than using a single large JOIN. This means PowerSync only re-evaluates the specific table query that changed (e.g., editing a work tracker only re-fires `useWorkTrackersTable`, not the blocks or events queries). Assembly into the final `Bleacher[]` shape happens in plain TypeScript via `groupBy` + `map`.

```
db/hooks/tables/
  useBleachersTable.ts         Bleachers + HomeBases
  useBleacherEventsTable.ts    BleacherEvents + Events + Addresses
  useBlocksTable.ts            Blocks
  useWorkTrackersTable.ts      WorkTrackers + Drivers + Users + Addresses
  useMaintenanceEventsTable.ts BleacherMaintEvents + MaintenanceEvents + Addresses
  useDamageReportsTable.ts     DamageReports + WorkTrackers (pre/post inspection dates)
  useEventsTable.ts            Events + Addresses (supports onlyMine filter)
  useEventBleachersTable.ts    BleacherEvents bleacher assignments
```

### Optimistic updates

Mutations (save/delete work trackers, save/delete blocks, drag-and-drop) update the Zustand stores immediately after the REST/PowerSync write, before waiting for the sync stream round-trip. This gives instant UI feedback. The PowerSync watched queries eventually re-fire with the canonical data from the server, overwriting the optimistic values.

Optimistic update examples:
- `WorkTrackerModal.tsx` — save and delete handlers update `useDashboardBleachersStore` and `useWorkTrackersStore` directly
- `CellEditor.tsx` — block save and delete update `useDashboardBleachersStore` directly
- `WorkTrackerDragManager.ts` — drag-and-drop updates `useDashboardBleachersStore` and `useWorkTrackersStore` directly

## PixiJS Rendering

### Component tree

```
page.tsx
  DashboardApp.tsx          React component, mounts PixiJS Application
    main.ts                 Entry point, creates Dashboard instance
      Dashboard.ts          Orchestrator class, owns all grids and state
        Grid.ts (x5)        Generic virtualized grid with cell recycling
          ICellRenderer      Interface for rendering strategies
```

### Grid layout

The dashboard uses a 4-quadrant sticky layout (plus a pinned Y overlay):

```
+------------------+----------------------------------------+
| TopLeftCell      | StickyTopRow (date headers)             |
| (1x1 corner)    | Scrolls horizontally with main grid     |
+------------------+----------------------------------------+
| StickyLeftColumn | MainGrid (bleacher x date cells)        |
| (bleacher names) | Scrolls both directions                 |
| Scrolls vert.   |                                          |
|                  | MainGridPinnedYAxis (event span overlay)|
|                  | Scrolls vertically, pinned to left edge |
+------------------+----------------------------------------+
```

### Cell renderers

Each grid region has its own `ICellRenderer` implementation:

| Renderer | Grid | Purpose |
|---|---|---|
| `TopLeftCellRenderer` | Top-left corner | Static corner cell |
| `StickyTopRowCellRenderer` | Top row | Date column headers |
| `StickyLeftColumnCellRenderer` | Left column | Bleacher number + info cells |
| `MainGridCellRenderer` | Main grid | Event spans, work trackers, blocks, damage alerts |
| `PinnedYCellRenderer` | Pinned Y overlay | Event name labels pinned to the viewport left edge |

### Recompute cycle

When any Zustand store changes:

1. `store.subscribe()` fires in `Dashboard.ts`
2. `scheduleRecompute()` queues a recompute via `requestAnimationFrame` (coalesces rapid updates)
3. `recompute()` reads all stores, applies dashboard filters (bleacher filters, season, account manager, y-axis mode)
4. `rebuildGrids()` tears down and recreates all grid cell renderers with the new data

### Key utilities

- **`Grid.ts`** — Generic virtualized grid with cell recycling, scroll synchronization, and scrollbar support
- **`Baker.ts`** — Bakes PixiJS display objects into static textures for performance
- **`CellEditor.ts`** — Manages the cell editor overlay positioning relative to grid scroll
- **`WorkTrackerDragManager.ts`** — Handles drag-and-drop of work trackers between cells with optimistic updates
- **`ResizeManager.ts`** — Debounced resize handling for the PixiJS canvas
- **`PngManager.ts`** — Fetches and caches PNG assets (e.g., GoodShuffle logo)

## UI Components (React)

These React components render as overlays on top of the PixiJS canvas:

- **`CellEditor.tsx`** — Modal for editing block text, creating work trackers/events
- **`WorkTrackerModal.tsx`** (in `features/workTrackers`) — Full work tracker edit form
- **`SwapConfirmationModal.tsx`** — Confirms bleacher-event swap operations
- **`BleacherLocationModal.tsx`** — Shows bleacher GPS location via Linxup
- **`AddressTooltip.tsx`** — Hover tooltip showing event address on the grid

## Types

Defined in `types.ts`:

- **`Bleacher`** — Core type with nested arrays of events, blocks, work trackers, maintenance events, damage reports
- **`BleacherEvent`** — Event span on a bleacher row
- **`BleacherBlock`** — Text note on a cell
- **`BleacherWorkTracker`** — Work tracker indicator with driver/status info
- **`BleacherMaintenanceEvent`** — Maintenance event span
- **`BleacherDamageReport`** — Damage report with safety flags
- **`DashboardEvent`** — Event data for the events y-axis view

## File structure

```
dashboard/
  Dashboard.ts                  Orchestrator class
  DashboardApp.tsx              React mount point
  main.ts                       Entry point
  types.ts                      Type definitions
  functions.ts                  Alert calculation, event utilities
  values/
    constants.ts                Cell dimensions, layout constants
    dynamic.ts                  Dynamic value helpers
  cellRenderers/
    MainGridCellRenderer.ts
    PinnedYCellRenderer.ts
    StickyLeftColumnCellRenderer.ts
    StickyTopRowCellRenderer.ts
    TopLeftCellRenderer.ts
  ui/
    Tile.ts, HeaderCell.ts, BleacherCell.ts, etc.
    event/                      Event span rendering
      worktracker/              Work tracker cell rendering
  util/
    Grid.ts                     Virtualized grid engine
    Baker.ts                    Texture baking
    CellEditor.ts               Cell editor positioning
    WorkTrackerDragManager.ts   Drag-and-drop
    ResizeManager.ts            Resize handling
    supabaseClientRegistry.ts   Supabase client access for non-React code
  state/
    useDashboardBleachersStore.ts
    useDashboardEventsStore.ts
    useSelectedBlock.ts
    useSwapStore.ts
    useScrollToDateStore.ts
    useAddressTooltipStore.ts
    useBleacherLocationModalStore.ts
    useDriverUnavailabilityStore.ts
  db/
    hooks/
      tables/                   Per-table PowerSync reactive queries
      useBleachers.ts           Assembles Bleacher[] from table hooks
      useEvents.ts              Assembles DashboardEvent[] from table hooks
      useDashboardData.ts       Bridges hook data into Zustand stores
      useDriverUnavailability.ts
    client/                     Supabase REST mutation functions
    server/                     Server-side data fetching
  components/
    CellEditor.tsx
    SwapConfirmationModal.tsx
    BleacherLocationModal.tsx
    AddressTooltip.tsx
```
