import { Graphics, Sprite } from "pixi.js";
import { Baker } from "../util/Baker";

export class Tile extends Sprite {
  constructor(dimensions: { width: number; height: number }, baker: Baker) {
    super();

    const tileTexture = baker.getTexture(`tile`, dimensions, (c) => {
      const tileGraphics = new Graphics();

      // Draw tile background (light gray)
      tileGraphics.rect(0, 0, dimensions.width, dimensions.height).fill(0xf8f9fa);

      // Draw border (slightly darker gray)
      tileGraphics
        .rect(0, 0, dimensions.width, dimensions.height)
        .stroke({ color: 0xe9ecef, width: 1 });
      c.addChild(tileGraphics);
      console.log("tile");
    });

    this.texture = tileTexture;
  }
}
