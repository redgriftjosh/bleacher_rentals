import { Container } from "pixi.js";

/**
 * Interface for cell rendering strategies
 * CellRenderer implementations contain the business logic for what to render at each coordinate
 */
export interface ICellRenderer {
  /**
   * Render a cell at the given grid coordinates with specified dimensions
   * @param row The row coordinate (future: bleacher index)
   * @param col The column coordinate (future: date index)
   * @param cellWidth The width this cell should occupy
   * @param cellHeight The height this cell should occupy
   * @returns Container with the complete cell content
   */
  renderCell(row: number, col: number, cellWidth: number, cellHeight: number): Container;
}
