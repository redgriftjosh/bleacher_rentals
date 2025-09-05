import { Application, Container, TilingSprite, Text } from "pixi.js";
import { Tile } from "./Tile";
import { BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT } from "../values/constants";

export class StickyTopLeftCell extends Container {
  constructor(app: Application) {
    super();
    const tile = new Tile(app, { width: BLEACHER_COLUMN_WIDTH, height: HEADER_ROW_HEIGHT }).texture;

    const background = new TilingSprite({
      texture: tile,
      width: BLEACHER_COLUMN_WIDTH,
      height: HEADER_ROW_HEIGHT,
      position: { x: 0, y: 0 },
    });

    const label = new Text({
      text: "Bleachers",
      style: { fill: 0x333333, fontSize: 16, align: "center", fontWeight: "bold" },
    });
    label.anchor.set(0, 0);
    label.x = 5;
    label.y = HEADER_ROW_HEIGHT - label.height - 5;
    background.addChild(label);
    this.addChild(background);
  }
}
