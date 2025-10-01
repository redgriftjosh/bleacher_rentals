import { Application, Container, Graphics, FederatedWheelEvent } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { SCROLLBAR_THICKNESS, VerticalScrollbar } from "./VerticalScrollbar";
import { HORIZONTAL_SCROLLBAR_THICKNESS, HorizontalScrollbar } from "./HorizontalScrollbar";

export interface GridOptions {
  app: Application;
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  gridWidth: number;
  gridHeight: number;
  cellRenderer: ICellRenderer;
  x?: number;
  y?: number;
  showScrollbar?: boolean;
}

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
  private gridWidth: number;
  private gridHeight: number;
  private cellRenderer: ICellRenderer;
  private showScrollbar: boolean;
  private verticalScrollbar?: VerticalScrollbar;
  private horizontalScrollbar?: HorizontalScrollbar;
  private gridContainer: Container; // Container for the actual grid cells
  private contentMask?: Graphics; // Mask to prevent content from overlapping scrollbars

  constructor(options: GridOptions) {
    super();

    this.app = options.app;
    this.rows = options.rows;
    this.cols = options.cols;
    this.cellWidth = options.cellWidth;
    this.cellHeight = options.cellHeight;
    this.gridWidth = options.gridWidth;
    this.gridHeight = options.gridHeight;
    this.cellRenderer = options.cellRenderer;
    this.showScrollbar = options.showScrollbar ?? true; // Default to true

    // Set position if provided
    if (options.x !== undefined) this.position.x = options.x;
    if (options.y !== undefined) this.position.y = options.y;

    console.log(
      `Creating ${this.rows}x${this.cols} grid with ${this.cellWidth}x${this.cellHeight} cells using ${this.cellRenderer.constructor.name}`
    );
    console.log(
      `Grid viewport: ${this.gridWidth}x${this.gridHeight}px at (${this.position.x}, ${this.position.y})`
    );
    console.log(`Scrollbars visible: ${this.showScrollbar}`);

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
    const viewportHeight = this.gridHeight;
    const viewportWidth = this.gridWidth;

    const needsVerticalScrollbar = contentHeight > viewportHeight;
    const needsHorizontalScrollbar = contentWidth > viewportWidth;

    // Only create mask if at least one scrollbar will be visible AND showScrollbar is true
    if ((needsVerticalScrollbar || needsHorizontalScrollbar) && this.showScrollbar) {
      let maskWidth = this.gridWidth;
      let maskHeight = this.gridHeight;

      // Reduce mask dimensions based on which scrollbars are present and visible
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
    // If showScrollbar is false or no scrollbars needed, no mask needed - content can use full dimensions
  }

  /**
   * Create scrollbars if content is larger than viewport
   */
  private createScrollbars() {
    const contentHeight = this.getContentHeight();
    const contentWidth = this.getContentWidth();
    const viewportHeight = this.gridHeight;
    const viewportWidth = this.gridWidth;

    const needsVerticalScrollbar = contentHeight > viewportHeight;
    const needsHorizontalScrollbar = contentWidth > viewportWidth;

    // Get grid's world position for scrollbar positioning
    const gridWorldPos = this.getGlobalPosition();

    // Create vertical scrollbar if needed, but only show it if showScrollbar is true
    if (needsVerticalScrollbar) {
      this.verticalScrollbar = new VerticalScrollbar(
        this.app,
        contentHeight,
        viewportHeight,
        this,
        needsHorizontalScrollbar,
        gridWorldPos.x,
        gridWorldPos.y,
        this.gridWidth,
        this.gridHeight,
        this.showScrollbar
      );
    }

    // Create horizontal scrollbar if needed, but only show it if showScrollbar is true
    if (needsHorizontalScrollbar) {
      this.horizontalScrollbar = new HorizontalScrollbar(
        this.app,
        contentWidth,
        viewportWidth,
        this,
        needsVerticalScrollbar,
        gridWorldPos.x,
        gridWorldPos.y,
        this.gridWidth,
        this.gridHeight,
        this.showScrollbar
      );
    }
  }

  /**
   * Set up scroll event listening
   */
  private setupScrolling() {
    this.on("grid:scroll-vertical", this.updateY);
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
   * Supports diagonal scrolling by handling both directions simultaneously
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

    let handled = false;

    // Handle shift+wheel for horizontal scrolling (maps vertical wheel to horizontal)
    if (e.shiftKey && Math.abs(deltaY) > 0) {
      if (this.horizontalScrollbar) {
        this.horizontalScrollbar.handleWheel(deltaY); // Use deltaY when shift is pressed
        handled = true;
      }
    }
    // Handle horizontal wheel events (trackpad horizontal scrolling)
    else if (Math.abs(deltaX) > 0) {
      if (this.horizontalScrollbar) {
        this.horizontalScrollbar.handleWheel(deltaX);
        handled = true;
      }
    }

    // Handle vertical wheel events (can happen simultaneously with horizontal)
    if (Math.abs(deltaY) > 0 && !e.shiftKey) {
      if (this.verticalScrollbar) {
        this.verticalScrollbar.handleWheel(deltaY);
        handled = true;
      }
    }

    // Prevent default browser scrolling if we handled any scrolling
    if (handled) {
      e.preventDefault();
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
    this.off("grid:scroll-vertical", this.updateY);
    this.off("grid:scroll-horizontal", this.updateX);
    super.destroy(options);
    console.log("Grid destroyed");
  }
}
