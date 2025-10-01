import { Application, Graphics, RenderTexture } from "pixi.js";

/**
 * Red tile for special grid cells
 * Hardcoded red background instead of conditional logic
 */
export class RedTile {
  public texture: RenderTexture;

  constructor(app: Application, dimensions: { width: number; height: number }) {
    // Create graphics for the tile
    const tileGraphics = new Graphics();

    // Draw red tile background (hardcoded)
    tileGraphics.rect(0, 0, dimensions.width, dimensions.height).fill(0xff0000);

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
