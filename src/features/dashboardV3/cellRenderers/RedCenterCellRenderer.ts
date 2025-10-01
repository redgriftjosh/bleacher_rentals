import { Application, Container, Sprite } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Tile } from "../ui/Tile";
import { RedTile } from "../ui/RedTile";

/**
 * CellRenderer that renders a red tile at row 3, col 3
 * Demonstrates coordinate-based conditional rendering
 */
export class RedCenterCellRenderer implements ICellRenderer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Render a cell based on coordinates and dimensions provided by Grid
   * Future: This is where we'll look up bleachers by row, dates by col, check for events, etc.
   */
  renderCell(row: number, col: number, cellWidth: number, cellHeight: number): Container {
    const cellContainer = new Container();
    const dimensions = { width: cellWidth, height: cellHeight };

    // Coordinate-based conditional logic
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
    // - Add animations, hover effects, etc.

    return cellContainer;
  }
}
