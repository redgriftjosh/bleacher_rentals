import { Application, Graphics, RenderTexture } from "pixi.js";

type TileOptions = {
  width: number;
  height: number;
};

export class Tile {
  public readonly texture: RenderTexture;
  constructor(private app: Application, private opts: TileOptions) {
    const cellObj = new Graphics()
      .moveTo(opts.width, 0)
      .lineTo(opts.width, opts.height - 1) // right line inside
      .moveTo(0, opts.height - 1)
      .lineTo(opts.width, opts.height - 1) // bottom line inside
      .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 });

    // blank tile with same size as cell
    const tile = RenderTexture.create({
      width: opts.width,
      height: opts.height,
      resolution: this.app.renderer.resolution,
    });

    // render the maker into the tile
    app.renderer.render({
      container: cellObj,
      target: tile, // the RenderTexture to draw into
      clear: true, // clear RT before drawing (set false to accumulate)
    });

    // clean up
    cellObj.destroy();

    this.texture = tile;
  }
}
