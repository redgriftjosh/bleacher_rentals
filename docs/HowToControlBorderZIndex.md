# How to Control Border Z-Index in the PixiJS Grid

## The Problem

The grid uses **virtualization** — a fixed pool of `Container` instances is recycled as the user scrolls. All pool containers live inside `gridContainer`, which has `sortableChildren = true`. This means PixiJS sorts them by each container's `zIndex` before compositing, so a container with a higher `zIndex` renders on top of all containers with a lower `zIndex`, regardless of DOM order.

**Consequence for borders**: if a `Sprite` draws a border that visually extends into a neighbouring cell (e.g. the left cap of an event span), the neighbouring cell's container can render on top of it and clip the border, making it invisible.

---

## How Event Spans Solve It

Every call to `buildCell` sets `parent.zIndex` using this formula:

```ts
const Z_ROW = 10000;
parent.zIndex = (row + 1) * Z_ROW - col * 2 + (isStart ? 1 : 0);
```

Key properties of this formula:

| Factor                 | Effect                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `(row + 1) * Z_ROW`    | Higher rows have larger base z — prevents row bleeding                                              |
| `- col * 2`            | Earlier columns have a larger z than later columns — start cells overlap end cells of earlier spans |
| `+ 1` on start cells   | Start cells always render above middle/end cells in the same row and column                         |
| Tile cells stay at `0` | Empty tiles never obscure event content                                                             |

A start cell at `(row=2, col=50)` gets `zIndex = 30000 - 100 + 1 = 29901`.  
Its middle cell at `col=51` gets `zIndex = 30000 - 102 = 28898`.  
So the start cell renders on top — its left border is visible over the empty tile to its left.

---

## Adding a New Overlay That Must Appear Above Everything

If you add a new visual that must render **above events AND work trackers**, you need to beat the maximum event `zIndex`.

The maximum event `zIndex` is approximately `rows * Z_ROW` (ignoring column adjustment). For a 500-row grid that is `5,000,000`.

**Pattern used by `SubrentalOverlayBody`:**

```ts
// 1. Give the overlay sprite a high child-level zIndex so it sorts above
//    WorkTrackerGroup (99999) within its own container.
overlay.zIndex = 100_000;
parent.sortableChildren = true;

// 2. Boost the container's zIndex above all event containers.
//    10_000_000 base puts it above any realistic row*Z_ROW value.
//    Preserve column ordering so start caps render above neighbours.
const srContainerZ = (row + 1) * Z_ROW + 10_000_000 - col * 2 + (isStart ? 1 : 0);
if (parent.zIndex < srContainerZ) {
  parent.zIndex = srContainerZ;
}
```

The `if (parent.zIndex < srContainerZ)` guard is important: a cell can contain **both** an event body and an SR overlay. The event body already set `parent.zIndex` using the standard formula; we only raise it, never lower it.

---

## Two Levels of Z-Ordering

There are two independent z-ordering contexts:

```
gridContainer (sortableChildren = true)
  └── poolContainer [parent.zIndex controls order here]
        ├── EventBody sprite      [child zIndex — controls order within the cell]
        ├── WorkTrackerGroup      [zIndex 99999]
        └── SubrentalOverlayBody  [zIndex 100000 — wins within cell]
```

- **Container level** (`parent.zIndex`): controls which cell container renders on top of which.
- **Child level** (`sprite.zIndex` inside a `sortableChildren = true` container): controls stacking within a single cell.

To guarantee a border is always visible:

1. Ensure the **container** beats all neighbouring containers (`parent.zIndex` formula above).
2. Ensure the **sprite** beats all siblings inside its container (`overlay.zIndex = 100_000`).

---

## Z-Index Budget Summary

| Content type              | Container `zIndex` range                                  |
| ------------------------- | --------------------------------------------------------- |
| Empty tiles               | `0`                                                       |
| Event / maintenance cells | `(row+1)*10000 - col*2 [+1]` ≈ `0 – ~5,000,000`           |
| Subrental overlay cells   | `(row+1)*10000 + 10,000,000 - col*2 [+1]` ≈ `10,000,000+` |

Child `zIndex` within a cell:

| Child                | `zIndex`     |
| -------------------- | ------------ |
| Damage tile          | `-1`         |
| EventBody / Tile     | (default, 0) |
| WorkTrackerGroup     | `99,999`     |
| SubrentalOverlayBody | `100,000`    |
