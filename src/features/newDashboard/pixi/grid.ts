import { Application, Container, Graphics, RenderTexture, TilingSprite, Text } from "pixi.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DASHBOARD_PADDING_X,
  DASHBOARD_PADDING_Y,
} from "../values/constants";
import { getGridSize } from "../values/dynamic";
import { Bleacher } from "../db/client/bleachers";

export function grid(app: Application, bleachers: Bleacher[]) {
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
    height: gridHeight - CELL_HEIGHT,
    position: { x: CELL_WIDTH, y: CELL_HEIGHT },
  });

  const stickyLeftColumn = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: gridHeight - CELL_HEIGHT,
    position: { x: 0, y: CELL_HEIGHT },
  });

  const stickyTopRow = new TilingSprite({
    texture: tile,
    width: gridWidth - CELL_WIDTH,
    height: CELL_HEIGHT,
    position: { x: CELL_WIDTH, y: 0 },
  });

  const stickyTopLeftCell = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    position: { x: 0, y: 0 },
  });

  // container for the grid & border
  const gridContainer = new Container();
  gridContainer.addChild(mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell);

  // ====== DATA → labels in sticky left column ======
  const rows = bleachers.length;
  const dataHeight = rows * CELL_HEIGHT;

  // make the grid only as tall as the data
  stickyLeftColumn.height = dataHeight;
  mainScrollableGrid.height = dataHeight;

  // labels layer (sticks horizontally, scrolls vertically)
  const leftLabels = new Container();
  leftLabels.position.set(0, CELL_HEIGHT); // start under header
  gridContainer.addChild(leftLabels);

  // one label per row
  for (let r = 0; r < rows; r++) {
    const t = new Text({
      text: String(bleachers[r].bleacher_number),
      style: { fill: 0x333333, fontSize: 14, align: "center" },
    });
    t.anchor.set(0.5);
    t.position.set(CELL_WIDTH / 2, r * CELL_HEIGHT + CELL_HEIGHT / 2);
    leftLabels.addChild(t);
  }

  app.stage.on("hscroll:nx", (v: number) => {
    mainScrollableGrid.tilePosition.x = -v;
    stickyTopRow.tilePosition.x = -v;
  });

  app.stage.on("hscroll:ny", (v: number) => {
    mainScrollableGrid.tilePosition.y = -v;
    stickyLeftColumn.tilePosition.y = -v;
    leftLabels.y = CELL_HEIGHT - v;
  });

  const border = new Graphics()
    .rect(0, 0, gridWidth, gridHeight)
    .stroke({ width: 1, color: 0x000000, alpha: 0.15, alignment: 0 }); // inside stroke
  gridContainer.addChild(border);
  app.stage.addChild(gridContainer);
}
