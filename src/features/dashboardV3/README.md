# DashboardV3 - Simple Grid

Super simple grid system for DashboardV3.

## Structure

- **`DashboardAppV3.tsx`** - Main app component (unchanged)
- **`main.ts`** - Simple entry point that creates a 5x5 grid
- **`ui/Grid.ts`** - Simple grid that repeats a tile
- **`ui/Tile.ts`** - Basic tile component

## Usage

```typescript
import { main } from "./main";

// Creates a simple 5x5 grid
const { grid } = main(app);
```

That's it! No complex configurations, no cell renderers, just a simple grid of tiles.

## Files

### main.ts

- Takes just the PixiJS app
- Creates a 5x5 grid
- Returns the grid instance

### Grid.ts

- Takes app, rows, and columns
- Uses the existing Tile class
- Creates Sprite instances for each cell
- Positions them in a grid pattern

### Tile.ts

- Creates a simple textured tile
- **NEW**: Accepts position parameters for conditional styling
- Row 3, Col 3 gets a red background!
- Used by Grid to create each uniquely styled cell

## Conditional Styling

The tile at row 3, column 3 will have a red background instead of the default light gray. This demonstrates how to add position-based conditional styling to tiles.

Very straightforward and easy to understand!
