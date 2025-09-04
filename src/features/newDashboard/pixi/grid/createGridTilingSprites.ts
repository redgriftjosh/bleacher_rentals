import { Application, RenderTexture, TilingSprite, Text } from "pixi.js";
import {
  BLEACHER_COLUMN_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
} from "../../values/constants";
import { Tile } from "../ui/Tile";

function createMainScrollableGrid(
  gridWidth: number,
  gridHeight: number,
  tile: RenderTexture
): TilingSprite {
  const mainScrollableGrid = new TilingSprite({
    texture: tile,
    width: gridWidth - BLEACHER_COLUMN_WIDTH,
    height: gridHeight - HEADER_ROW_HEIGHT,
    position: { x: BLEACHER_COLUMN_WIDTH, y: HEADER_ROW_HEIGHT },
  });

  return mainScrollableGrid;
}

function createStickyLeftColumn(gridHeight: number, tile: RenderTexture): TilingSprite {
  const stickyLeftColumn = new TilingSprite({
    texture: tile,
    width: BLEACHER_COLUMN_WIDTH,
    height: gridHeight - HEADER_ROW_HEIGHT,
    position: { x: 0, y: HEADER_ROW_HEIGHT },
  });

  return stickyLeftColumn;
}

function createStickyTopRow(gridWidth: number, tile: RenderTexture): TilingSprite {
  const stickyTopRow = new TilingSprite({
    texture: tile,
    width: gridWidth - BLEACHER_COLUMN_WIDTH,
    height: HEADER_ROW_HEIGHT,
    position: { x: BLEACHER_COLUMN_WIDTH, y: 0 },
  });

  return stickyTopRow;
}

function createStickyTopLeftCell(tile: RenderTexture): TilingSprite {
  const stickyTopLeftCell = new TilingSprite({
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
  stickyTopLeftCell.addChild(label);

  return stickyTopLeftCell;
}

export function createGridTilingSprites(app: Application, gridWidth: number, gridHeight: number) {
  // const tile = createTile(app);
  const tile = new Tile(app, { width: CELL_WIDTH, height: CELL_HEIGHT }).texture;
  const headerTile = new Tile(app, { width: CELL_WIDTH, height: HEADER_ROW_HEIGHT }).texture;
  const bleacherTile = new Tile(app, { width: BLEACHER_COLUMN_WIDTH, height: CELL_HEIGHT }).texture;
  const topLeftTile = new Tile(app, {
    width: BLEACHER_COLUMN_WIDTH,
    height: HEADER_ROW_HEIGHT,
  }).texture;

  const mainScrollableGrid = createMainScrollableGrid(gridWidth, gridHeight, tile);
  const stickyLeftColumn = createStickyLeftColumn(gridHeight, bleacherTile);
  const stickyTopRow = createStickyTopRow(gridWidth, headerTile);
  const stickyTopLeftCell = createStickyTopLeftCell(topLeftTile);

  return { mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell };
}
