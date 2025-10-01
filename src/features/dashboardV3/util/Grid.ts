import { Application, Container } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";

/**
 * Generic Grid class that depends on a CellRenderer for rendering logic
 * Grid handles positioning and cell dimensions, CellRenderer handles what to render at each coordinate
 */
export class Grid extends Container {
  private app: Application;
  private rows: number;
  private cols: number;
  private cellWidth: number;
  private cellHeight: number;
  private cellRenderer: ICellRenderer;

  constructor(
    app: Application,
    rows: number,
    cols: number,
    cellWidth: number,
    cellHeight: number,
    cellRenderer: ICellRenderer
  ) {
    super();

    this.app = app;
    this.rows = rows;
    this.cols = cols;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.cellRenderer = cellRenderer;

    console.log(
      `Creating ${rows}x${cols} grid with ${cellWidth}x${cellHeight} cells using ${cellRenderer.constructor.name}`
    );

    // Create and render the grid
    this.renderGrid();

    console.log("✅ Grid created with CellRenderer");
  }

  /**
   * Render the grid by asking CellRenderer what to render at each coordinate
   */
  private renderGrid() {
    // Create grid by calling cellRenderer for each position
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Ask the CellRenderer what to render at this coordinate with our dimensions
        const cellContainer = this.cellRenderer.renderCell(
          row,
          col,
          this.cellWidth,
          this.cellHeight
        );

        // Position the container in the grid using our dimensions
        cellContainer.position.set(col * this.cellWidth, row * this.cellHeight);

        // Add to grid
        this.addChild(cellContainer);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    super.destroy(options);
    console.log("Grid destroyed");
  }
}
