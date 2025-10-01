import { Container } from "pixi.js";

/**
 * Interface for cell rendering strategies
 * CellRenderer implementations contain the business logic for what to render at each coordinate
 *
 * Renderers should focus on BUILDING cell content by composing UI components from src/features/dashboardV3/ui/
 * The Grid handles automatic baking and caching via Baker for performance
 */
export interface ICellRenderer {
  /**
   * Build cell content at the given grid coordinates with specified dimensions
   * This should create and return a Container with the complete cell content.
   * The Grid will automatically handle baking this into a cached RenderTexture.
   *
   * @param row The row coordinate (future: bleacher index)
   * @param col The column coordinate (future: date index)
   * @param cellWidth The width this cell should occupy
   * @param cellHeight The height this cell should occupy
   * @returns Container with the complete cell content (will be baked by Grid)
   */
  buildCell(row: number, col: number, cellWidth: number, cellHeight: number): Container;

  /**
   * Generate a unique cache key for this cell
   * Used by Baker to cache rendered textures. Should include all data that affects appearance.
   *
   * @param row The row coordinate
   * @param col The column coordinate
   * @param cellWidth The width this cell should occupy
   * @param cellHeight The height this cell should occupy
   * @returns Unique string key for Baker caching
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string;
}
