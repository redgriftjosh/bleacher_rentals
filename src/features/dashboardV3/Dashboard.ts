import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { RedCenterCellRenderer } from "./cellRenderers/RedCenterCellRenderer";
import { CELL_HEIGHT, CELL_WIDTH } from "../dashboard/values/constants";

export class Dashboard {
  private headerGrid: Grid;
  private mainGrid: Grid;

  constructor(app: Application) {
    const cellRenderer = new RedCenterCellRenderer(app);

    // Calculate dimensions
    const headerHeight = CELL_HEIGHT; // One cell tall
    const mainGridHeight = app.screen.height - headerHeight;

    // Create header grid - 1 row tall, same width as main grid
    this.headerGrid = new Grid({
      app,
      rows: 1,
      cols: 40,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: app.screen.width,
      gridHeight: headerHeight,
      cellRenderer,
      x: 0,
      y: 0,
      showScrollbar: false,
    });

    // Create main grid positioned below header
    this.mainGrid = new Grid({
      app,
      rows: 40,
      cols: 40,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: app.screen.width,
      gridHeight: mainGridHeight,
      cellRenderer,
      x: 0,
      y: headerHeight,
    });

    app.stage.addChild(this.headerGrid);
    app.stage.addChild(this.mainGrid);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.headerGrid.destroy();
    this.mainGrid.destroy();
  }
}
