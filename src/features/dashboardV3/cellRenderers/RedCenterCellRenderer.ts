import { Application, Container, Sprite } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Tile } from "../ui/Tile";
import { RedTile } from "../ui/RedTile";

/**
 * CellRenderer that renders a red tile at row 3, col 3
 * Demonstrates coordinate-based conditional rendering using UI components
 *
 * This renderer BUILDS cell content by composing UI components from src/features/dashboardV3/ui/
 * The Grid handles automatic baking and caching for performance
 */
export class RedCenterCellRenderer implements ICellRenderer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Build cell content by composing UI components
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(row: number, col: number, cellWidth: number, cellHeight: number): Container {
    const cellContainer = new Container();
    const dimensions = { width: cellWidth, height: cellHeight };

    // Coordinate-based conditional logic - compose different UI components
    if (row === 3 && col === 3) {
      // Red tile for center position
      const redTile = new RedTile(this.app, dimensions);
      const sprite = new Sprite(redTile.texture);
      cellContainer.addChild(sprite);
    } else {
      // Default tile for all other positions
      const defaultTile = new Tile(this.app, dimensions);
      const sprite = new Sprite(defaultTile.texture);
      cellContainer.addChild(sprite);
    }

    // Future enhancements will go here:
    // - Look up bleacher data by row: const bleacher = bleachers[row];
    // - Look up date by col: const date = dates[col];
    // - Check for events: if (hasEvent(bleacher.id, date)) { ... }
    // - Add click handlers: cellContainer.interactive = true; cellContainer.on('click', ...);
    // - Add text overlays, icons, borders, etc. from UI component library

    return cellContainer;
  }

  /**
   * Generate unique cache key for Baker
   * Include all data that affects the cell's appearance
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string {
    // For this simple renderer, the cache key is based on:
    // - Cell type (red vs default)
    // - Dimensions
    const cellType = row === 3 && col === 3 ? "red" : "default";
    return `cell:${cellType}:${cellWidth}x${cellHeight}`;

    // Future: Include more data that affects appearance
    // return `cell:${cellType}:${cellWidth}x${cellHeight}:bleacher:${bleacherId}:date:${date}:hasEvent:${hasEvent}`;
  }
}
