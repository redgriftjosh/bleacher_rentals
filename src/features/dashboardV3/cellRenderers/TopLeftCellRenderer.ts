import { Application, Container } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Baker } from "../util/Baker";
import { TopLeftCell } from "../ui/TopLeftCell";

/**
 * CellRenderer for the main scrollable grid area
 * Renders cells with event spans when events are present
 *
 * This renderer BUILDS cell content by composing UI components from src/features/dashboardV3/ui/
 * The Grid handles automatic baking and caching for performance
 */
export class TopLeftCellRenderer implements ICellRenderer {
  private baker: Baker;

  constructor(app: Application) {
    this.baker = new Baker(app);
  }

  /**
   * Build cell content by composing UI components
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

    // const tile = new BakedTile(dimensions, this.baker);
    const tile = new TopLeftCell(dimensions, this.baker);
    parent.addChild(tile);
    return parent;
  }

  /**
   * Generate unique cache key for Baker
   * Include all data that affects the cell's appearance
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string {
    return `cell:default:${cellWidth}x${cellHeight}`;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    // this.assetManager.destroy();
  }
}
