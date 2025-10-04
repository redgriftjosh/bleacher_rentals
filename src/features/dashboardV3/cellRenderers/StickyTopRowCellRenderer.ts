import { Application, Container, Sprite } from "pixi.js";
import { DateTime } from "luxon";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { HeaderCell } from "../ui/HeaderCell";
import { Tile } from "../ui/Tile";
import { getColumnsAndDates } from "../../dashboard/util/scrollbar";
import { Baker } from "../util/Baker";

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
  private baker: Baker;

  constructor(app: Application) {
    this.app = app;
    this.baker = new Baker(app);

    // Get dates using the utility function
    const { dates } = getColumnsAndDates();
    this.dates = dates;
    this.todayISO = DateTime.now().toISODate();
  }

  /**
   * Build cell content using HeaderCell component with Tile background
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(
    row: number,
    col: number,
    cellWidth: number,
    cellHeight: number,
    parent: Container,
    firstVisibleColumn?: number
  ): Container {
    parent.removeChildren();
    const dimensions = { width: cellWidth, height: cellHeight };

    const headerCellTexture = this.baker.getSprite(`headerCellTexture${col}`, dimensions, (c) => {
      // Add background tile first (behind the HeaderCell)
      const tileSprite = new Tile(dimensions, this.baker);
      c.addChild(tileSprite);

      // Get the date for this column
      const dateISO = this.dates[col];

      if (dateISO) {
        // Create a HeaderCell and set the date (on top of the tile)
        const headerCell = new HeaderCell();
        headerCell.setDateISO(dateISO, this.todayISO);
        c.addChild(headerCell);
      }
      console.log("headerCellTexture");
    });
    parent.addChild(headerCellTexture);
    return parent;
  }
}
