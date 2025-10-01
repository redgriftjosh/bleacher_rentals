import { Application, Container, Graphics, FederatedWheelEvent } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { SCROLLBAR_THICKNESS, VerticalScrollbar } from "./VerticalScrollbar";
import { HORIZONTAL_SCROLLBAR_THICKNESS, HorizontalScrollbar } from "./HorizontalScrollbar";

/**
 * Generic Grid class that depends on a CellRenderer for rendering logic
 * Grid handles positioning and cell dimensions, CellRenderer handles what to render at each coordinate
 * Includes built-in horizontal and vertical scrolling
 */
export class Grid extends Container {
  private app: Application;
  private rows: number;
  private cols: number;
  private cellWidth: number;
  private cellHeight: number;
  private cellRenderer: ICellRenderer;
  private verticalScrollbar?: VerticalScrollbar;
  private horizontalScrollbar?: HorizontalScrollbar;
  private gridContainer: Container; // Container for the actual grid cells
  private contentMask?: Graphics; // Mask to prevent content from overlapping scrollbars

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

    // Create content mask to prevent overlap with scrollbars
    this.createContentMask();

    // Create and render the grid
    this.renderGrid();

    // Create scrollbars if needed
    this.createScrollbars();

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
   * Create mask to prevent grid content from overlapping with scrollbars
   * Only applies if scrollbars are actually visible
   */
  private createContentMask() {
    const contentHeight = this.getContentHeight();
    const contentWidth = this.getContentWidth();
    const viewportHeight = this.app.screen.height;
    const viewportWidth = this.app.screen.width;

    const needsVerticalScrollbar = contentHeight > viewportHeight;
    const needsHorizontalScrollbar = contentWidth > viewportWidth;

    // Only create mask if at least one scrollbar will be visible
    if (needsVerticalScrollbar || needsHorizontalScrollbar) {
      let maskWidth = this.app.screen.width;
      let maskHeight = this.app.screen.height;

      // Reduce mask dimensions based on which scrollbars are present
      if (needsVerticalScrollbar) {
        maskWidth -= SCROLLBAR_THICKNESS;
      }
      if (needsHorizontalScrollbar) {
        maskHeight -= HORIZONTAL_SCROLLBAR_THICKNESS;
      }

      this.contentMask = new Graphics()
        .rect(0, 0, maskWidth, maskHeight)
        .fill({ color: 0xffffff, alpha: 1 });

      this.addChild(this.contentMask);
      this.gridContainer.mask = this.contentMask;
    }
    // If no scrollbars needed, no mask needed - content can use full dimensions
  }

  /**
   * Create scrollbars if content is larger than viewport
   */
  private createScrollbars() {
    const contentHeight = this.getContentHeight();
    const contentWidth = this.getContentWidth();
    const viewportHeight = this.app.screen.height;
    const viewportWidth = this.app.screen.width;

    const needsVerticalScrollbar = contentHeight > viewportHeight;
    const needsHorizontalScrollbar = contentWidth > viewportWidth;

    // Create vertical scrollbar if needed, with info about horizontal scrollbar
    if (needsVerticalScrollbar) {
      this.verticalScrollbar = new VerticalScrollbar(
        this.app,
        contentHeight,
        viewportHeight,
        this,
        needsHorizontalScrollbar
      );
    }

    // Create horizontal scrollbar if needed, with info about vertical scrollbar
    if (needsHorizontalScrollbar) {
      this.horizontalScrollbar = new HorizontalScrollbar(
        this.app,
        contentWidth,
        viewportWidth,
        this,
        needsVerticalScrollbar
      );
    }
  }

  /**
   * Set up scroll event listening
   */
  private setupScrolling() {
    this.on("grid:scroll", this.updateY);
    this.on("grid:scroll-horizontal", this.updateX);

    // Set up wheel event coordination
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on("wheel", this.onWheel);
  }

  /**
   * Update the Y position of the grid content based on vertical scroll
   */
  private updateY = (scrollY: number) => {
    this.gridContainer.position.y = -scrollY;
  };

  /**
   * Update the X position of the grid content based on horizontal scroll
   */
  private updateX = (scrollX: number) => {
    this.gridContainer.position.x = -scrollX;
  };

  /**
   * Coordinate wheel events between vertical and horizontal scrollbars
   */
  private onWheel = (e: FederatedWheelEvent) => {
    let deltaY = e.deltaY;
    let deltaX = e.deltaX;

    // Normalize deltas based on mode
    if (e.deltaMode === 1) {
      deltaY *= 16; // Lines to pixels
      deltaX *= 16;
    } else if (e.deltaMode === 2) {
      deltaY *= 100; // Pages to pixels
      deltaX *= 100;
    }

    // Handle shift+wheel for horizontal scrolling
    if (e.shiftKey) {
      if (this.horizontalScrollbar) {
        this.horizontalScrollbar.handleWheel(deltaY); // Use deltaY when shift is pressed
        e.preventDefault();
      }
    }
    // Handle horizontal wheel events
    else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (this.horizontalScrollbar) {
        this.horizontalScrollbar.handleWheel(deltaX);
        e.preventDefault();
      }
    }
    // Handle vertical wheel events
    else if (Math.abs(deltaY) >= Math.abs(deltaX)) {
      if (this.verticalScrollbar) {
        this.verticalScrollbar.handleWheel(deltaY);
        e.preventDefault();
      }
    }
  };

  /**
   * Get the total height of the grid content
   */
  public getContentHeight(): number {
    return this.rows * this.cellHeight;
  }

  /**
   * Get the total width of the grid content
   */
  public getContentWidth(): number {
    return this.cols * this.cellWidth;
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    // Remove wheel event listener
    this.app.stage.off("wheel", this.onWheel);

    // Clean up scrollbars
    if (this.verticalScrollbar) {
      this.verticalScrollbar.destroy();
    }
    if (this.horizontalScrollbar) {
      this.horizontalScrollbar.destroy();
    }
    // Clean up mask (only exists if scrollbars were needed)
    if (this.contentMask) {
      this.gridContainer.mask = null;
      this.contentMask.destroy();
    }
    // Remove scroll listeners
    this.off("grid:scroll", this.updateY);
    this.off("grid:scroll-horizontal", this.updateX);
    super.destroy(options);
    console.log("Grid destroyed");
  }
}
