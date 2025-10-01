import { Application } from "pixi.js";
import { Grid } from "./Grid";

export class Dashboard {
  constructor(app: Application) {
    // Create simple 5x5 grid
    const grid = new Grid(app, 5, 5);

    // Add to stage
    app.stage.addChild(grid);
  }
}
