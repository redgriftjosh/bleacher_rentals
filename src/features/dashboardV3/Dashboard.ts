import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { MainScrollableGridCellRenderer } from "./cellRenderers/MainScrollableGridCellRenderer";
import { StickyLeftColumnCellRenderer } from "./cellRenderers/StickyLeftColumnCellRenderer";
import { StickyTopRowCellRenderer } from "./cellRenderers/StickyTopRowCellRenderer";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
  BLEACHER_COLUMN_WIDTH,
} from "../dashboard/values/constants";
import { Bleacher } from "../dashboard/db/client/bleachers";
import { getColumnsAndDates } from "../dashboard/util/scrollbar";

export class Dashboard {
  private stickyTopLeftCell: Grid;
  private stickyTopRow: Grid;
  private stickyLeftColumn: Grid;
  private mainScrollableGrid: Grid;

  constructor(app: Application, bleachers: Bleacher[]) {
    const cellRenderer = new MainScrollableGridCellRenderer(app);
    const leftColumnCellRenderer = new StickyLeftColumnCellRenderer(app, bleachers);
    const topRowCellRenderer = new StickyTopRowCellRenderer(app);

    // Calculate viewport dimensions
    const viewportWidth = app.screen.width - BLEACHER_COLUMN_WIDTH;
    const viewportHeight = app.screen.height - HEADER_ROW_HEIGHT;

    // Use real bleacher count for row dimensions and real date count for columns
    const bleacherCount = bleachers.length;
    const { columns: contentColumns } = getColumnsAndDates(); // Use actual date range

    // Create the 4-quadrant sticky grid layout

    // Top-left: Fixed corner cell (1x1)
    this.stickyTopLeftCell = new Grid({
      app,
      rows: 1,
      cols: 1,
      cellWidth: BLEACHER_COLUMN_WIDTH,
      cellHeight: HEADER_ROW_HEIGHT,
      gridWidth: BLEACHER_COLUMN_WIDTH,
      gridHeight: HEADER_ROW_HEIGHT,
      cellRenderer,
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
      cellRenderer: topRowCellRenderer, // Use specialized renderer for date headers
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
    this.mainScrollableGrid = new Grid({
      app,
      rows: bleacherCount, // Dynamic based on actual bleacher data
      cols: contentColumns, // Keep columns hardcoded as requested
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: viewportHeight,
      cellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: true, // Only main grid shows scrollbars
    });

    // Add grids in bottom-to-top stacking order
    app.stage.addChild(this.mainScrollableGrid);
    app.stage.addChild(this.stickyLeftColumn);
    app.stage.addChild(this.stickyTopRow);
    app.stage.addChild(this.stickyTopLeftCell);

    // Set up scroll synchronization
    this.setupScrollSynchronization();
  }

  /**
   * Synchronize scrolling between the quadrants
   */
  private setupScrollSynchronization() {
    // When main grid scrolls vertically, sync the left column
    this.mainScrollableGrid.on("grid:scroll-vertical", (scrollY: number) => {
      this.stickyLeftColumn.setVerticalScroll(scrollY);
    });

    // When main grid scrolls horizontally, sync the top row
    this.mainScrollableGrid.on("grid:scroll-horizontal", (scrollX: number) => {
      this.stickyTopRow.setHorizontalScroll(scrollX);
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stickyTopLeftCell.destroy();
    this.stickyTopRow.destroy();
    this.stickyLeftColumn.destroy();
    this.mainScrollableGrid.destroy();
  }
}
