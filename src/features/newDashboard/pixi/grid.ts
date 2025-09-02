import { Application, Container, Graphics, RenderTexture, TilingSprite } from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH, DASHBOARD_PADDING_X, DASHBOARD_PADDING_Y } from "../values";

export function grid(app: Application) {
  const gridW = app.screen.width - DASHBOARD_PADDING_X * 2;
  const gridH = app.screen.height - DASHBOARD_PADDING_Y * 2;

  // maker object
  const cellObj = new Graphics()
    .moveTo(CELL_WIDTH, 0)
    .lineTo(CELL_WIDTH, CELL_HEIGHT - 1) // right line inside
    .moveTo(0, CELL_HEIGHT - 1)
    .lineTo(CELL_WIDTH - 1, CELL_HEIGHT - 1) // bottom line inside
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

  // create a TilingSprite from the tile
  // Make sure it's as wide as the screen minus the padding * 2 so looks like uniform padding all around.
  const grid = new TilingSprite({
    texture: tile,
    width: gridW,
    height: gridH,
  });

  // container for the grid & border
  const gridContainer = new Container();
  gridContainer.position.set(DASHBOARD_PADDING_X, DASHBOARD_PADDING_Y);

  // add to stage
  gridContainer.addChild(grid);

  const border = new Graphics()
    .rect(0, 0, gridW, gridH)
    .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 }); // inside stroke
  gridContainer.addChild(border);
  app.stage.addChild(gridContainer);
}
