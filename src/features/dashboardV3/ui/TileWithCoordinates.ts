import { Application, Container, Sprite, Text } from "pixi.js";
import { Tile } from "./Tile";
import { Baker } from "../util/Baker";

export class TileWithCoordinates extends Container {
  constructor(
    row: number,
    col: number,
    app: Application,
    dimensions: { width: number; height: number },
    baker: Baker
  ) {
    super();

    const defaultTile = new Tile(app, dimensions);
    const tileSprite = new Sprite(defaultTile.texture);

    const coordinates = new Text({
      text: `${row}, ${col}`,
      style: {
        fontFamily: "Helvetica",
        fontSize: 14,
        fontWeight: "500",
        fill: 0x000000,
        align: "left",
      },
    });

    this.addChild(tileSprite, coordinates);
  }
}
