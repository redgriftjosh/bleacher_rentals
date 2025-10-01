# DashboardV3 - Simple Grid with CellRenderer

Super simple grid system for DashboardV3 with clean separation of concerns.

## Structure

- **`DashboardAppV3.tsx`** - React component that mounts PixiJS app
- **`main.ts`** - Entry point that creates Dashboard class
- **`ui/Grid.ts`** - Grid that uses CellRenderer to determine tiles
- **`ui/CellRenderer.ts`** - Contains conditional logic for tile selection
- **`ui/Tile.ts`** - Default light gray tile
- **`ui/RedTile.ts`** - Red tile for special cells

## Usage

```typescript
import { main } from "./main";

// Creates a simple 5x5 grid with conditional red tile at (3,3)
const { grid } = main(app);
```

## Architecture

### Grid Flow:

1. Grid creates CellRenderer
2. For each position, Grid asks CellRenderer which tile to use
3. CellRenderer returns appropriate tile texture based on position logic
4. Grid creates Sprite with that texture

### Files

#### main.ts

- Entry point for PixiJS app
- Creates a 5x5 grid

#### Grid.ts

- Takes app, rows, and columns
- Creates CellRenderer instance
- Uses CellRenderer to get tile textures for each position
- Positions sprites in grid pattern

#### CellRenderer.ts

- **Contains all conditional logic**
- `getTileTexture(row, col)` method
- Returns RedTile for row 3, col 3
- Returns default Tile for all other positions

#### Tile.ts

- Simple default tile with light gray background
- No conditional logic, just basic tile rendering

#### RedTile.ts

- Hardcoded red background tile
- Duplicate of Tile but with red color

## Conditional Styling

The CellRenderer contains the logic: `if (row === 3 && col === 3)` then use RedTile, otherwise use default Tile.

This separates the conditional logic from the tile rendering, making it easy to add more tile types and conditions in the future!
