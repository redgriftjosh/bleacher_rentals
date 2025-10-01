import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { RedCenterCellRenderer } from "./cellRenderers/RedCenterCellRenderer";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
  BLEACHER_COLUMN_WIDTH,
} from "../dashboard/values/constants";

export class Dashboard {
  private stickyTopLeftCell: Grid;
  private stickyTopRow: Grid;
  private stickyLeftColumn: Grid;
  private mainScrollableGrid: Grid;

  constructor(app: Application) {
    const cellRenderer = new RedCenterCellRenderer(app);

    // Calculate viewport dimensions
    const viewportWidth = app.screen.width - BLEACHER_COLUMN_WIDTH;
    const viewportHeight = app.screen.height - HEADER_ROW_HEIGHT;

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
      cols: 40000, // Content columns
      cellWidth: CELL_WIDTH,
      cellHeight: HEADER_ROW_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: HEADER_ROW_HEIGHT,
      cellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: 0,
      showScrollbar: false, // Hide scrollbars for sticky sections
    });

    // Bottom-left: Sticky left column (vertical scrollable)
    this.stickyLeftColumn = new Grid({
      app,
      rows: 40000, // Content rows (match main grid)
      cols: 1,
      cellWidth: BLEACHER_COLUMN_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: BLEACHER_COLUMN_WIDTH,
      gridHeight: viewportHeight,
      cellRenderer,
      x: 0,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: false, // Hide scrollbars for sticky sections
    });

    // Bottom-right: Main scrollable content
    this.mainScrollableGrid = new Grid({
      app,
      rows: 40000,
      cols: 40000,
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
