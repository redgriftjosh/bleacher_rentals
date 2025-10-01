import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { RedCenterCellRenderer } from "./cellRenderers/RedCenterCellRenderer";
import { CELL_HEIGHT, CELL_WIDTH } from "../dashboard/values/constants";

export class Dashboard {
  constructor(app: Application) {
    // Create a CellRenderer with red-at-center logic
    const cellRenderer = new RedCenterCellRenderer(app);

    // Create 5x5 grid with specific cell dimensions that uses the CellRenderer
    const grid = new Grid(app, 30, 30, CELL_WIDTH, CELL_HEIGHT, cellRenderer);

    // Add to stage
    app.stage.addChild(grid);
  }
}
