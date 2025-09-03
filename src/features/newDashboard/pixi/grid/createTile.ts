import { Application, Graphics, RenderTexture } from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH } from "../../values/constants";

export function createTile(app: Application): RenderTexture {
  const cellObj = new Graphics()
    .moveTo(CELL_WIDTH, 0)
    .lineTo(CELL_WIDTH, CELL_HEIGHT - 1) // right line inside
    .moveTo(0, CELL_HEIGHT - 1)
    .lineTo(CELL_WIDTH, CELL_HEIGHT - 1) // bottom line inside
    .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 });

  // blank tile with same size as cell
  const tile = RenderTexture.create({
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    resolution: app.renderer.resolution,
  });

  // render the maker into the tile
  app.renderer.render({
    container: cellObj,
    target: tile, // the RenderTexture to draw into
    clear: true, // clear RT before drawing (set false to accumulate)
  });

  // clean up
  cellObj.destroy();
  return tile;
}
