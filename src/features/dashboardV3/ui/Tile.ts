import { Graphics, Sprite } from "pixi.js";
import { Baker } from "../util/Baker";
import { HoverableBakedSprite } from "../util/HoverableBakedSprite";

export class Tile extends HoverableBakedSprite {
  private row: number;
  private col: number;

  constructor(
    dimensions: { width: number; height: number },
    baker: Baker,
    row: number,
    col: number
  ) {
    super(
      baker,
      `tile-${dimensions.width}x${dimensions.height}`,
      (c) => {
        // Normal tile content (baked version)
        const cellObj = new Graphics()
          .moveTo(dimensions.width, 0)
          .lineTo(dimensions.width, dimensions.height - 1) // right line inside
          .moveTo(0, dimensions.height - 1)
          .lineTo(dimensions.width, dimensions.height - 1) // bottom line inside
          .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 });

        // Draw tile background (light gray)
        const fill = new Graphics().rect(0, 0, dimensions.width, dimensions.height).fill(0xffffff);

        c.addChild(fill, cellObj);
        console.log("tile baked");
      },
      dimensions
    );

    this.row = row;
    this.col = col;

    // Add click listener
    this.on("pointerup", this.handleClick.bind(this));
  }

  /**
   * Handle click events on the tile
   */
  private handleClick(): void {
    // Emit cell edit request with coordinates
    this.emit("cell:edit-request", { row: this.row, col: this.col });
    console.log(`Tile clicked: (${this.row}, ${this.col})`);
  }

  /**
   * Override the content builder to provide hover animation
   */
  protected buildLiveContent(container: any) {
    const dimensions = this.dimensions;
    if (!dimensions) return;

    // Create the same tile content as baked version
    const fill = new Graphics().rect(0, 0, dimensions.width, dimensions.height).fill(0xffffff);

    const cellObj = new Graphics()
      .moveTo(dimensions.width, 0)
      .lineTo(dimensions.width, dimensions.height - 1)
      .moveTo(0, dimensions.height - 1)
      .lineTo(dimensions.width, dimensions.height - 1)
      .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 });

    // Create hover overlay for darkening effect (starts invisible)
    const hoverOverlay = new Graphics();
    hoverOverlay
      .rect(0, 0, dimensions.width, dimensions.height)
      .fill({ color: 0x000000, alpha: 0.03 }); // Set to target alpha immediately

    container.addChild(fill, cellObj, hoverOverlay);

    console.log("tile live with hover animation");
  }
}
