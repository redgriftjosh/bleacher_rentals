import { Text, Sprite } from "pixi.js";
import { Baker } from "../util/Baker";
import { Tile } from "./Tile";

export class TopLeftCell extends Sprite {
  constructor(dimensions: { width: number; height: number }, baker: Baker) {
    super();

    const texture = baker.getTexture(`TopLeftTile`, dimensions, (c) => {
      const tile = new Tile(dimensions, baker, 0, 0);
      const label = new Text({
        text: "Bleachers",
        style: { fill: 0x333333, fontSize: 16, align: "center", fontWeight: "bold" },
      });
      label.anchor.set(0, 0);
      label.x = 5;
      label.y = dimensions.height - label.height - 5;
      c.addChild(tile, label);
      // console.log("TopLeftTile");
    });

    this.texture = texture;
  }
}
