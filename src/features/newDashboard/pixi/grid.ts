import { Application, Container, Graphics, RenderTexture, TilingSprite } from "pixi.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DASHBOARD_PADDING_X,
  DASHBOARD_PADDING_Y,
} from "../values/constants";
import { getGridSize } from "../values/dynamic";

export function grid(app: Application) {
  const { gridWidth, gridHeight } = getGridSize(app);
  // maker object
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

  // create a TilingSprite from the tile
  // Make sure it's as wide as the screen minus the padding * 2 so looks like uniform padding all around.
  const mainScrollableGrid = new TilingSprite({
    texture: tile,
    width: gridWidth - CELL_WIDTH,
    height: gridHeight,
    position: { x: CELL_WIDTH, y: 0 },
  });

  const stickyLeftColumn = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: gridHeight,
  });

  // container for the grid & border
  const gridContainer = new Container();
  gridContainer.position.set(DASHBOARD_PADDING_X, DASHBOARD_PADDING_Y);
  gridContainer.addChild(mainScrollableGrid, stickyLeftColumn);

  app.stage.on("hscroll:nx", (v: number) => {
    mainScrollableGrid.tilePosition.x = -v;
  });

  app.stage.on("hscroll:ny", (v: number) => {
    mainScrollableGrid.tilePosition.y = -v;
    stickyLeftColumn.tilePosition.y = -v;
  });

  const border = new Graphics()
    .rect(0, 0, gridWidth, gridHeight)
    .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 }); // inside stroke
  gridContainer.addChild(border);
  app.stage.addChild(gridContainer);
}
