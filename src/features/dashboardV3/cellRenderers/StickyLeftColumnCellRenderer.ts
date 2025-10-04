import { Application, Container, Sprite } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { BleacherCell } from "../ui/BleacherCell";
import { Tile } from "../ui/Tile";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";

/**
 * CellRenderer for the sticky left column that displays bleacher information
 * Uses BleacherCell component to show bleacher details in each row
 *
 * This renderer creates BleacherCell instances that display real bleacher data
 * The Grid handles automatic baking and caching for performance
 */
export class StickyLeftColumnCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private bleachers: Bleacher[];

  constructor(app: Application, bleachers: Bleacher[]) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
  }

  /**
   * Build cell content using BleacherCell component
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(
    row: number,
    col: number,
    cellWidth: number,
    cellHeight: number,
    parent: Container
  ): Container {
    // PERFORMANCE CRITICAL: Reuse existing container
    parent.removeChildren();

    const dimensions = { width: cellWidth, height: cellHeight };

    // Add background tile first (behind the BleacherCell)
    const tileSprite = new Tile(dimensions, this.baker);
    parent.addChild(tileSprite);

    // Get the bleacher data for this row
    const bleacher = this.bleachers[row];

    if (bleacher) {
      // Create a BleacherCell and set the bleacher data (on top of the tile)
      const bleacherCell = new BleacherCell(this.baker);
      bleacherCell.setBleacher(bleacher);
      parent.addChild(bleacherCell);
    }

    return parent;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
  }
}
