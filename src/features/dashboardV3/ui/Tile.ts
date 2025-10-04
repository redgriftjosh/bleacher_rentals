import { Graphics, Sprite } from "pixi.js";
import { Baker } from "../util/Baker";

export class Tile extends Sprite {
  constructor(dimensions: { width: number; height: number }, baker: Baker) {
    super();

    const tileTexture = baker.getTexture(`tile`, dimensions, (c) => {
      const cellObj = new Graphics()
        .moveTo(dimensions.width, 0)
        .lineTo(dimensions.width, dimensions.height - 1) // right line inside
        .moveTo(0, dimensions.height - 1)
        .lineTo(dimensions.width, dimensions.height - 1) // bottom line inside
        .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 });
      // const tileGraphics = new Graphics();

      // Draw tile background (light gray)
      const fill = new Graphics().rect(0, 0, dimensions.width, dimensions.height).fill(0xffffff);

      // // Draw border (slightly darker gray)
      // tileGraphics
      //   .rect(0, 0, dimensions.width, dimensions.height)
      //   .stroke({ color: 0xe9ecef, width: 1 });
      c.addChild(fill, cellObj);
      console.log("tile");
    });

    this.texture = tileTexture;
  }
}
