import { Application, RenderTexture, TilingSprite } from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH, HEADER_ROW_HEIGHT } from "../../values/constants";
import { createTile } from "./createTile";
import { Tile } from "../ui/Tile";

function createMainScrollableGrid(
  gridWidth: number,
  gridHeight: number,
  tile: RenderTexture
): TilingSprite {
  const mainScrollableGrid = new TilingSprite({
    texture: tile,
    width: gridWidth - CELL_WIDTH,
    height: gridHeight - HEADER_ROW_HEIGHT,
    position: { x: CELL_WIDTH, y: HEADER_ROW_HEIGHT },
  });

  return mainScrollableGrid;
}

function createStickyLeftColumn(gridHeight: number, tile: RenderTexture): TilingSprite {
  const stickyLeftColumn = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: gridHeight - HEADER_ROW_HEIGHT,
    position: { x: 0, y: HEADER_ROW_HEIGHT },
  });

  return stickyLeftColumn;
}

function createStickyTopRow(gridWidth: number, tile: RenderTexture): TilingSprite {
  const stickyTopRow = new TilingSprite({
    texture: tile,
    width: gridWidth - CELL_WIDTH,
    height: HEADER_ROW_HEIGHT,
    position: { x: CELL_WIDTH, y: 0 },
  });

  return stickyTopRow;
}

function createStickyTopLeftCell(tile: RenderTexture): TilingSprite {
  const stickyTopLeftCell = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: HEADER_ROW_HEIGHT,
    position: { x: 0, y: 0 },
  });

  return stickyTopLeftCell;
}

export function createGridTilingSprites(app: Application, gridWidth: number, gridHeight: number) {
  // const tile = createTile(app);
  const tile = new Tile(app, { width: CELL_WIDTH, height: CELL_HEIGHT }).texture;
  const headerTile = new Tile(app, { width: CELL_WIDTH, height: HEADER_ROW_HEIGHT }).texture;
  const mainScrollableGrid = createMainScrollableGrid(gridWidth, gridHeight, tile);
  const stickyLeftColumn = createStickyLeftColumn(gridHeight, tile);
  const stickyTopRow = createStickyTopRow(gridWidth, headerTile);
  const stickyTopLeftCell = createStickyTopLeftCell(headerTile);

  return { mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell };
}
