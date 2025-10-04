import { Application, Graphics } from "pixi.js";
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

  constructor(app: Application, bleachers: Bleacher[]) {
    // Get dates for event calculations
    const { columns: contentColumns, dates } = getColumnsAndDates();

    this.mainGridCellRenderer = new MainGridCellRenderer(app, bleachers, dates);
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

    // Set up scroll synchronization
    this.setupScrollSynchronization();

    // Initialize both renderers with starting scroll position
    this.mainGridPinYCellRenderer.updateScrollPosition(0, CELL_WIDTH);
    this.mainGridCellRenderer.updateScrollPosition(0, CELL_WIDTH);
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
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stickyTopLeftCell.destroy();
    this.stickyTopRow.destroy();
    this.stickyLeftColumn.destroy();
    this.mainGrid.destroy();
  }
}
