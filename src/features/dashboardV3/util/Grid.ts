import { Application, Container, Graphics, FederatedWheelEvent, Sprite } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { SCROLLBAR_THICKNESS, VerticalScrollbar } from "./VerticalScrollbar";
import { HORIZONTAL_SCROLLBAR_THICKNESS, HorizontalScrollbar } from "./HorizontalScrollbar";
import { Baker } from "./Baker";

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
  private baker: Baker; // Baker for texture caching

  // Virtualization properties
  private visibleRows: number;
  private visibleCols: number;
  private prevFirstVisibleRow = -1;
  private prevFirstVisibleCol = -1;
  private cellPool: Container[][] = []; // Pool of reusable cell containers
  private cellPoolData: { row: number; col: number }[][] = []; // Track what each pool cell currently shows
  private currentScrollX = 0;
  private currentScrollY = 0;

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

    // Initialize Baker for texture caching
    this.baker = new Baker(this.app);

    // Calculate visible cells for virtualization
    this.visibleRows = Math.ceil(this.gridHeight / this.cellHeight) + 2; // +2 for buffer
    this.visibleCols = Math.ceil(this.gridWidth / this.cellWidth) + 2; // +2 for buffer

    // Set position if provided
    if (options.x !== undefined) this.position.x = options.x;
    if (options.y !== undefined) this.position.y = options.y;

    // console.log(
    //   `Creating ${this.rows}x${this.cols} grid with ${this.cellWidth}x${this.cellHeight} cells using ${this.cellRenderer.constructor.name}`
    // );
    // console.log(
    //   `Grid viewport: ${this.gridWidth}x${this.gridHeight}px at (${this.position.x}, ${this.position.y})`
    // );
    // console.log(`Scrollbars visible: ${this.showScrollbar}`);
    // console.log(`Virtualization: enabled (default)`);
    // console.log(`Visible cells: ${this.visibleRows}x${this.visibleCols} (includes buffer)`);

    // Create container for grid cells
    this.gridContainer = new Container();
    this.addChild(this.gridContainer);

    // Create content mask to prevent overlap with scrollbars
    this.createContentMask();

    // Initialize cell pool for virtualization
    this.initializeCellPool();

    // initialize the grid at 0, 0
    this.updateVirtualizedCells(0, 0);

    // Create scrollbars if needed
    this.createScrollbars();

    // Listen for scroll events
    this.setupScrolling();

    console.log("✅ Grid created with CellRenderer and built-in scroll support");
  }

  /**
   * Initialize cell pool for virtualization
   */
  private initializeCellPool() {
    // Create a 2D pool of Container instances that we can reuse
    for (let r = 0; r < this.visibleRows; r++) {
      this.cellPool[r] = [];
      this.cellPoolData[r] = [];
      for (let c = 0; c < this.visibleCols; c++) {
        const cellContainer = new Container();
        // Initially hidden until we have content to render
        cellContainer.visible = false;
        this.gridContainer.addChild(cellContainer);
        this.cellPool[r][c] = cellContainer;

        // Initialize with invalid coordinates to force initial rendering
        this.cellPoolData[r][c] = { row: -1, col: -1 };
      }
    }
  }

  /**
   * Update virtualized cells based on scroll position
   * OPTIMIZED: Only recreates cell content when coordinates actually change
   */
  private updateVirtualizedCells(scrollX: number, scrollY: number, force: boolean = false) {
    // Calculate which cells are currently visible
    const firstVisibleRow = Math.floor(scrollY / this.cellHeight);
    const firstVisibleCol = Math.floor(scrollX / this.cellWidth);

    // Only update if the visible area has changed
    if (
      firstVisibleRow === this.prevFirstVisibleRow &&
      firstVisibleCol === this.prevFirstVisibleCol
    ) {
      // ...Unless the user wants to force
      if (!force) {
        return;
      }
    }

    this.prevFirstVisibleRow = firstVisibleRow;
    this.prevFirstVisibleCol = firstVisibleCol;

    // Update cells for the visible area
    for (let r = 0; r < this.visibleRows; r++) {
      for (let c = 0; c < this.visibleCols; c++) {
        const actualRow = firstVisibleRow + r;
        const actualCol = firstVisibleCol + c;
        const poolContainer = this.cellPool[r][c];
        const currentData = this.cellPoolData[r][c];

        // Skip if outside grid bounds - hide the container
        if (actualRow >= this.rows || actualCol >= this.cols || actualRow < 0 || actualCol < 0) {
          poolContainer.visible = false;
          currentData.row = -1;
          currentData.col = -1;
          continue;
        }

        // Check if this container already shows the correct cell
        if (currentData.row === actualRow && currentData.col === actualCol) {
          // Already showing correct content, just ensure position and visibility
          poolContainer.position.set(actualCol * this.cellWidth, actualRow * this.cellHeight);
          poolContainer.visible = true;
          // ...Unless the user wants to force it
          if (!force) {
            continue;
          }
        }

        // Need to update cell content - only recreate if coordinates changed
        poolContainer.removeChildren();

        const cellContent = this.cellRenderer.buildCell(
          actualRow,
          actualCol,
          this.cellWidth,
          this.cellHeight,
          poolContainer,
          firstVisibleCol
        );

        // // Create sprite from baked texture
        // const cellSprite = new Sprite(bakedTexture);
        poolContainer.addChild(cellContent);
        poolContainer.position.set(actualCol * this.cellWidth, actualRow * this.cellHeight);
        poolContainer.visible = true;

        // Update tracking data
        currentData.row = actualRow;
        currentData.col = actualCol;
      }
    }

    // Emit event when virtualized cells update is complete
    this.emit("grid:firstVisibleColIndexChanged", firstVisibleCol);
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
    this.currentScrollY = scrollY;
    this.gridContainer.position.y = -scrollY;

    // Update virtualized cells
    this.updateVirtualizedCells(this.currentScrollX, this.currentScrollY);
  };

  /**
   * Update the X position of the grid content based on horizontal scroll
   */
  private updateX = (scrollX: number) => {
    this.currentScrollX = scrollX;
    this.gridContainer.position.x = -scrollX;

    // Keep viewport label layer fixed horizontally (don't sync X position)
    // this.viewportLabelLayer.position.x stays at 0

    // Update virtualized cells
    this.updateVirtualizedCells(this.currentScrollX, this.currentScrollY);
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
   * Manually set vertical scroll position (for synchronization)
   */
  public setVerticalScroll(scrollY: number) {
    this.updateY(scrollY);
  }

  /**
   * Manually set horizontal scroll position (for synchronization)
   */
  public setHorizontalScroll(scrollX: number) {
    this.updateX(scrollX);
  }

  /**
   * Force a complete re-render of all visible cells
   * Bypasses the coordinate change checks and forces cell content rebuilding
   */
  public forceUpdate() {
    this.updateVirtualizedCells(this.currentScrollX, this.currentScrollY, true);
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    // Remove wheel event listener
    this.app.stage.off("wheel", this.onWheel);

    // Clean up baker textures
    if (this.baker) {
      this.baker.destroyAll();
    }

    // Clean up scrollbars
    if (this.verticalScrollbar) {
      this.verticalScrollbar.destroy();
    }
    if (this.horizontalScrollbar) {
      this.horizontalScrollbar.destroy();
    }

    // Clean up cell pool
    if (this.cellPool) {
      for (const row of this.cellPool) {
        for (const cell of row) {
          if (cell && !cell.destroyed) {
            cell.destroy({ children: true });
          }
        }
      }
      this.cellPool = [];
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
