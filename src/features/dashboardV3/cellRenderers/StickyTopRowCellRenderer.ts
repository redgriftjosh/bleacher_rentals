import { Application, Container, Sprite } from "pixi.js";
import { DateTime } from "luxon";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { HeaderCell } from "../ui/HeaderCell";
import { Tile } from "../ui/Tile";
import { getColumnsAndDates } from "../../dashboard/util/scrollbar";

/**
 * CellRenderer for the sticky top row that displays date headers
 * Uses HeaderCell component to show dates with Tile background
 *
 * This renderer creates HeaderCell instances that display date information
 * The Grid handles automatic baking and caching for performance
 */
export class StickyTopRowCellRenderer implements ICellRenderer {
  private app: Application;
  private dates: string[];
  private todayISO: string;

  constructor(app: Application) {
    this.app = app;

    // Get dates using the utility function
    const { dates } = getColumnsAndDates();
    this.dates = dates;
    this.todayISO = DateTime.now().toISODate();
  }

  /**
   * Build cell content using HeaderCell component with Tile background
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(row: number, col: number, cellWidth: number, cellHeight: number): Container {
    const cellContainer = new Container();
    const dimensions = { width: cellWidth, height: cellHeight };

    // Add background tile first (behind the HeaderCell)
    const backgroundTile = new Tile(this.app, dimensions);
    const tileSprite = new Sprite(backgroundTile.texture);
    cellContainer.addChild(tileSprite);

    // Get the date for this column
    const dateISO = this.dates[col];

    if (dateISO) {
      // Create a HeaderCell and set the date (on top of the tile)
      const headerCell = new HeaderCell();
      headerCell.setDateISO(dateISO, this.todayISO);
      cellContainer.addChild(headerCell);
    }

    return cellContainer;
  }

  /**
   * Generate unique cache key for Baker
   * Include date and dimensions in the cache key
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string {
    const dateISO = this.dates[col];
    if (dateISO) {
      // Include whether it's today for proper caching of different styles
      const isToday = dateISO === this.todayISO;
      const dt = DateTime.fromISO(dateISO);
      const isWeekend = dt.weekday >= 6;
      const dateType = isToday ? "today" : isWeekend ? "weekend" : "weekday";
      return `header:${dateISO}:${dateType}:${cellWidth}x${cellHeight}`;
    }
    return `header:empty:${col}:${cellWidth}x${cellHeight}`;
  }
}
