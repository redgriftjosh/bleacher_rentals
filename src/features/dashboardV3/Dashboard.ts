import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { RedCenterCellRenderer } from "./cellRenderers/RedCenterCellRenderer";
import { CELL_HEIGHT, CELL_WIDTH } from "../dashboard/values/constants";

export class Dashboard {
  private grid: Grid;

  constructor(app: Application) {
    const cellRenderer = new RedCenterCellRenderer(app);
    this.grid = new Grid(app, 10, 5, CELL_WIDTH, CELL_HEIGHT, cellRenderer);

    app.stage.addChild(this.grid);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.grid.destroy();
  }
}
