import { Application, Graphics, RenderTexture } from "pixi.js";

/**
 * Simple tile generator for grid background
 * Creates a textured tile pattern with conditional styling based on position
 */
export class Tile {
  public texture: RenderTexture;

  constructor(
    app: Application,
    dimensions: { width: number; height: number },
    position?: { row: number; col: number }
  ) {
    // Create graphics for the tile
    const tileGraphics = new Graphics();

    // Conditional background color based on position
    let backgroundColor = 0xf8f9fa; // default light gray

    if (position && position.row === 3 && position.col === 3) {
      backgroundColor = 0xff0000; // red background for row 3, col 3
    }

    // Draw tile background
    tileGraphics.rect(0, 0, dimensions.width, dimensions.height).fill(backgroundColor);

    // Draw border (slightly darker gray)
    tileGraphics
      .rect(0, 0, dimensions.width, dimensions.height)
      .stroke({ color: 0xe9ecef, width: 1 });

    // Create render texture
    this.texture = RenderTexture.create({
      width: dimensions.width,
      height: dimensions.height,
    });

    // Render the graphics to the texture
    app.renderer.render({
      container: tileGraphics,
      target: this.texture,
    });

    // Clean up the graphics object
    tileGraphics.destroy();
  }

  destroy() {
    if (this.texture) {
      this.texture.destroy();
    }
  }
}
