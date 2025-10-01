import { Application, Container } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { VerticalScrollbar } from "./VerticalScrollbar";

/**
 * Generic Grid class that depends on a CellRenderer for rendering logic
 * Grid handles positioning and cell dimensions, CellRenderer handles what to render at each coordinate
 * Includes built-in vertical scrolling with VerticalScrollbar
 */
export class Grid extends Container {
  private app: Application;
  private rows: number;
  private cols: number;
  private cellWidth: number;
  private cellHeight: number;
  private cellRenderer: ICellRenderer;
  private scrollbar?: VerticalScrollbar;
  private gridContainer: Container; // Container for the actual grid cells

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

    // Create container for grid cells
    this.gridContainer = new Container();
    this.addChild(this.gridContainer);

    // Create and render the grid
    this.renderGrid();

    // Create scrollbar if needed
    this.createScrollbar();

    // Listen for scroll events
    this.setupScrolling();

    console.log("✅ Grid created with CellRenderer and built-in scroll support");
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

        // Add to grid container
        this.gridContainer.addChild(cellContainer);
      }
    }
  }

  /**
   * Create scrollbar if content is larger than viewport
   */
  private createScrollbar() {
    const contentHeight = this.getContentHeight();
    const viewportHeight = this.app.screen.height;

    if (contentHeight > viewportHeight) {
      this.scrollbar = new VerticalScrollbar(this.app, contentHeight, viewportHeight, this);
    }
  }

  /**
   * Set up scroll event listening
   */
  private setupScrolling() {
    this.on("grid:scroll", this.updateY);
  }

  /**
   * Update the Y position of the grid content based on scroll
   */
  private updateY = (scrollY: number) => {
    this.gridContainer.position.y = -scrollY;
  };

  /**
   * Get the total height of the grid content
   */
  public getContentHeight(): number {
    return this.rows * this.cellHeight;
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    // Clean up scrollbar
    if (this.scrollbar) {
      this.scrollbar.destroy();
    }
    // Remove scroll listener
    this.off("grid:scroll", this.updateY);
    super.destroy(options);
    console.log("Grid destroyed");
  }
}
