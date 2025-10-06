import { Application, Assets, Graphics, Sprite } from "pixi.js";
import { Grid } from "./util/Grid";
import { MainGridCellRenderer } from "./cellRenderers/MainGridCellRenderer";
import { StickyLeftColumnCellRenderer } from "./cellRenderers/StickyLeftColumnCellRenderer";
import { StickyTopRowCellRenderer } from "./cellRenderers/StickyTopRowCellRenderer";
import { PinnedYCellRenderer } from "./cellRenderers/PinnedYCellRenderer";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
  BLEACHER_COLUMN_WIDTH,
} from "../dashboard/values/constants";
import { Bleacher } from "../dashboard/db/client/bleachers";
import { getColumnsAndDates } from "../dashboard/util/scrollbar";
import { SCROLLBAR_THICKNESS } from "./util/VerticalScrollbar";
import { TopLeftCellRenderer } from "./cellRenderers/TopLeftCellRenderer";
import { PngManager } from "./util/PngManager";
import { CellEditor } from "./util/CellEditor";

export class Dashboard {
  // Grids
  private stickyTopLeftCell: Grid;
  private stickyTopRow: Grid;
  private stickyLeftColumn: Grid;
  private mainGrid: Grid;
  private mainGridPinnedYAxis: Grid;

  // Renderers
  private mainGridPinYCellRenderer: PinnedYCellRenderer; // Store reference for scroll updates
  private mainGridCellRenderer: MainGridCellRenderer; // Store reference for scroll updates

  // Cell editor
  private cellEditor: CellEditor;

  // Store app reference for centering calculations
  private app: Application;

  constructor(
    app: Application,
    bleachers: Bleacher[],
    opts?: {
      onWorkTrackerSelect?: (workTracker: {
        work_tracker_id: number;
        bleacher_id: number;
        date: string;
      }) => void;
      initialScrollX?: number | null;
      initialScrollY?: number | null;
    }
  ) {
    this.app = app;
    // Get dates for event calculations
    const { columns: contentColumns, dates } = getColumnsAndDates();

    this.mainGridCellRenderer = new MainGridCellRenderer(app, bleachers, dates, {
      onWorkTrackerSelect: opts?.onWorkTrackerSelect,
    });
    this.mainGridPinYCellRenderer = new PinnedYCellRenderer(app, bleachers, dates);
    const leftColumnCellRenderer = new StickyLeftColumnCellRenderer(app, bleachers);
    const topRowCellRenderer = new StickyTopRowCellRenderer(app);
    const topLeftCellRenderer = new TopLeftCellRenderer(app);

    // Calculate viewport dimensions
    const viewportWidth = app.screen.width - BLEACHER_COLUMN_WIDTH;
    const viewportHeight = app.screen.height - HEADER_ROW_HEIGHT;

    // Use real bleacher count for row dimensions and real date count for columns
    const bleacherCount = bleachers.length;

    // Top-left: Fixed corner cell (1x1)
    this.stickyTopLeftCell = new Grid({
      app,
      rows: 1,
      cols: 1,
      cellWidth: BLEACHER_COLUMN_WIDTH,
      cellHeight: HEADER_ROW_HEIGHT,
      gridWidth: BLEACHER_COLUMN_WIDTH,
      gridHeight: HEADER_ROW_HEIGHT,
      cellRenderer: topLeftCellRenderer,
      x: 0,
      y: 0,
      showScrollbar: false,
    });

    // Top-right: Sticky header row (horizontal scrollable)
    this.stickyTopRow = new Grid({
      app,
      rows: 1,
      cols: contentColumns,
      cellWidth: CELL_WIDTH,
      cellHeight: HEADER_ROW_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: HEADER_ROW_HEIGHT,
      cellRenderer: topRowCellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: 0,
      showScrollbar: false, // Hide scrollbars for sticky sections
    });

    // Bottom-left: Sticky left column (vertical scrollable)
    this.stickyLeftColumn = new Grid({
      app,
      rows: bleacherCount, // Dynamic based on actual bleacher data
      cols: 1,
      cellWidth: BLEACHER_COLUMN_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: BLEACHER_COLUMN_WIDTH,
      gridHeight: viewportHeight,
      cellRenderer: leftColumnCellRenderer, // Use specialized renderer for bleacher data
      x: 0,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: false, // Hide scrollbars for sticky sections
    });

    // Bottom-right: Main scrollable content
    this.mainGrid = new Grid({
      app,
      rows: bleacherCount, // Dynamic based on actual bleacher data
      cols: contentColumns, // Keep columns hardcoded as requested
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: viewportHeight,
      cellRenderer: this.mainGridCellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: true, // Only main grid shows scrollbars
      allowScrolling: true,
    });

    // another grid in front of main grid that renders the pinned y axis
    this.mainGridPinnedYAxis = new Grid({
      app,
      rows: bleacherCount,
      cols: 1,
      cellWidth: viewportWidth,
      cellHeight: CELL_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: viewportHeight,
      cellRenderer: this.mainGridPinYCellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: false,
      onlyUpdateWhenScrollStops: false, // 🚀 PERFORMANCE: Only update cells when scrolling stops
    });

    // When main grid completes a cell update cycle, update the pinned Y axis
    this.mainGrid.on("grid:firstVisibleColIndexChanged", (firstVisibleCol: number) => {
      // Update the pinned Y renderer with the main grid's first visible column
      this.mainGridPinYCellRenderer.setMainGridFirstVisibleColumn(firstVisibleCol);
      this.mainGridPinnedYAxis.forceUpdate();
    });

    // Add grids in bottom-to-top stacking order
    app.stage.addChild(this.mainGrid);
    app.stage.addChild(this.mainGridPinnedYAxis);
    app.stage.addChild(this.stickyLeftColumn);
    app.stage.addChild(this.stickyTopRow);
    app.stage.addChild(this.stickyTopLeftCell);

    // Initialize cell editor for the main grid
    this.cellEditor = new CellEditor({
      app,
      grid: this.mainGrid,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridOffsetX: BLEACHER_COLUMN_WIDTH, // Main grid's X offset
      gridOffsetY: HEADER_ROW_HEIGHT, // Main grid's Y offset
    });

    // Connect cell editor to the main grid renderer
    this.mainGridCellRenderer.setCellEditor(this.cellEditor);

    // Set up scroll synchronization
    this.setupScrollSynchronization();

    // Apply initial scroll positions if provided (after grids created & listeners bound)
    const hasX = typeof opts?.initialScrollX === "number" && opts.initialScrollX! >= 0;
    const hasY = typeof opts?.initialScrollY === "number" && opts.initialScrollY! >= 0;
    if (hasX) {
      this.mainGrid.setHorizontalScroll(opts!.initialScrollX!);
      this.stickyTopRow.setHorizontalScroll(opts!.initialScrollX!);
      this.mainGrid.updateHorizontalScrollbarPosition(opts!.initialScrollX!);
      this.cellEditor.setScrollPosition(opts!.initialScrollX!, 0);
    } else {
      // Center horizontally only if no saved X
      this.centerHorizontalScroll();
    }
    if (hasY) {
      this.mainGrid.setVerticalScroll(opts!.initialScrollY!);
      this.stickyLeftColumn.setVerticalScroll(opts!.initialScrollY!);
      this.mainGridPinnedYAxis.setVerticalScroll(opts!.initialScrollY!);
    }
  }

  /**
   * Center the horizontal scroll position on initial load
   * Returns the calculated center position
   */
  private centerHorizontalScroll(): number {
    // Calculate the center position based on content width and viewport width
    const contentWidth = this.mainGrid.getContentWidth();
    const viewportWidth = this.app.screen.width - BLEACHER_COLUMN_WIDTH;

    // Calculate center position (content width / 2 - viewport width / 2)
    const centerX = Math.max(0, (contentWidth - viewportWidth) / 2);

    console.log(
      `Centering horizontal scroll: contentWidth=${contentWidth}, viewportWidth=${viewportWidth}, centerX=${centerX}`
    );

    // Set the horizontal scroll on ALL grids that need horizontal centering
    this.mainGrid.setHorizontalScroll(centerX);
    this.stickyTopRow.setHorizontalScroll(centerX);

    // Update the scrollbar positions to match (only main grid has visible scrollbar)
    this.mainGrid.updateHorizontalScrollbarPosition(centerX);

    // Update the cell editor with the new scroll position
    this.cellEditor.setScrollPosition(centerX, 0);

    // Return the center position so we can use it for renderer initialization
    return centerX;
  }

  /**
   * Synchronize scrolling between the quadrants
   */
  private setupScrollSynchronization() {
    // When main grid scrolls vertically, sync the left column and pinned Y axis
    this.mainGrid.on("grid:scroll-vertical", (scrollY: number) => {
      this.stickyLeftColumn.setVerticalScroll(scrollY);
      this.mainGridPinnedYAxis.setVerticalScroll(scrollY);
    });

    // When main grid scrolls horizontally, sync the top row and update both renderers
    this.mainGrid.on("grid:scroll-horizontal", (scrollX: number) => {
      this.stickyTopRow.setHorizontalScroll(scrollX);

      // Update both renderers with current scroll position
      this.mainGridPinYCellRenderer.updateScrollPosition(scrollX, CELL_WIDTH);
      this.mainGridCellRenderer.updateScrollPosition(scrollX, CELL_WIDTH);
    });

    // Horizontal centering moved to constructor after potential initialScrollX check
  }

  /** Current scroll positions (content px) */
  public getScrollPositions(): { x: number; y: number } {
    const x = (this.mainGrid as any)?.getCurrentScrollX?.() ?? 0;
    const y = (this.mainGrid as any)?.getCurrentScrollY?.() ?? 0;
    return { x, y };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cellEditor.destroy();
    this.stickyTopLeftCell.destroy();
    this.stickyTopRow.destroy();
    this.stickyLeftColumn.destroy();
    this.mainGrid.destroy();
  }
}
