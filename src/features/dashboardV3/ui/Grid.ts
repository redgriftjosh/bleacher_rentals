import { Application, Container, Sprite } from "pixi.js";
import { Tile } from "./Tile";
import { CELL_HEIGHT, CELL_WIDTH } from "../../dashboard/values/constants";

/**
 * Simple Grid class for DashboardV3
 * Just repeats a tile in a grid pattern
 */
export class Grid extends Container {
  private app: Application;
  private rows: number;
  private cols: number;

  constructor(app: Application, rows: number, cols: number) {
    super();

    this.app = app;
    this.rows = rows;
    this.cols = cols;

    console.log(`Creating simple ${rows}x${cols} grid`);

    // Create and render the grid
    this.renderGrid();

    console.log("✅ Simple Grid created");
  }

  /**
   * Render the grid by creating tile sprites with position-based styling
   */
  private renderGrid() {
    // Create grid of tile sprites, each with position information
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Create a tile with position information for conditional styling
        const tile = new Tile(this.app, { width: CELL_WIDTH, height: CELL_HEIGHT }, { row, col });

        const tileSprite = new Sprite(tile.texture);
        tileSprite.position.set(col * CELL_WIDTH, row * CELL_HEIGHT);
        this.addChild(tileSprite);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    super.destroy(options);
    console.log("Grid destroyed");
  }
}
