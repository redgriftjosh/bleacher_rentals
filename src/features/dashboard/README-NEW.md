# dashboard - Generic Grid with ICellRenderer

Clean architecture where Grid depends on CellRenderer implementations for rendering logic.

## Structure

- **`DashboardAppV3.tsx`** - React component that mounts PixiJS app
- **`main.ts`** - Entry point that creates Dashboard class
- **`Dashboard.ts`** - Creates Grid with specific CellRenderer
- **`util/Grid.ts`** - Generic grid that depends on ICellRenderer
- **`ui/ICellRenderer.ts`** - Interface for cell rendering strategies
- **`ui/RedCenterCellRenderer.ts`** - Implementation that renders red at center
- **`ui/Tile.ts`** - Default light gray tile
- **`ui/RedTile.ts`** - Red tile for special cells

## Usage

```typescript
// Dashboard.ts
const cellRenderer = new RedCenterCellRenderer(app);
const grid = new Grid(app, 5, 5, cellRenderer);
```

## Architecture

### Grid is now generic and flexible:

1. **Grid** takes a CellRenderer as dependency
2. **CellRenderer** implements ICellRenderer interface
3. **For each coordinate**, Grid calls `cellRenderer.renderCell(row, col)`
4. **CellRenderer returns Container** with complete cell content
5. **Grid positions** the containers in the grid

### Files

#### ICellRenderer.ts

- Interface with `renderCell(row, col): Container`
- Defines contract for all cell rendering strategies

#### Grid.ts

- **Generic** - works with any ICellRenderer implementation
- **Dependency injection** - CellRenderer passed in constructor
- **Simple responsibility** - just positioning containers

#### RedCenterCellRenderer.ts

- **Contains business logic** for red-at-center behavior
- **Uses coordinates** to make rendering decisions
- **Returns full Container** with sprites, click handlers, etc.
- **Future-ready** for bleacher/date lookups

## Future Capabilities

The coordinate-based approach enables:

```typescript
// Future CellRenderer implementation
renderCell(row: number, col: number): Container {
  const bleacher = this.bleachers[row];  // Row = bleacher
  const date = this.dates[col];          // Col = date

  // Check for events
  if (hasEvent(bleacher.id, date)) {
    return this.renderEventCell(event);
  }

  // Add interactions
  container.interactive = true;
  container.on('click', () => this.handleCellClick(bleacher, date));

  return container;
}
```

## Multiple Grid Example (Future)

```typescript
// Different grids with different renderers
const grid1 = new Grid(app, 5, 5, new RedCenterCellRenderer(app));
const grid2 = new Grid(app, 3, 7, new BleacherEventCellRenderer(app, bleachers, dates));
const grid3 = new Grid(app, 10, 10, new CheckerboardCellRenderer(app));
```

Super clean separation of concerns!
