import { Application, RenderTexture, TilingSprite } from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH } from "../../values/constants";
import { createTile } from "./createTile";

function createMainScrollableGrid(
  gridWidth: number,
  gridHeight: number,
  tile: RenderTexture
): TilingSprite {
  const mainScrollableGrid = new TilingSprite({
    texture: tile,
    width: gridWidth - CELL_WIDTH,
    height: gridHeight - CELL_HEIGHT,
    position: { x: CELL_WIDTH, y: CELL_HEIGHT },
  });

  return mainScrollableGrid;
}

function createStickyLeftColumn(gridHeight: number, tile: RenderTexture): TilingSprite {
  const stickyLeftColumn = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: gridHeight - CELL_HEIGHT,
    position: { x: 0, y: CELL_HEIGHT },
  });

  return stickyLeftColumn;
}

function createStickyTopRow(gridWidth: number, tile: RenderTexture): TilingSprite {
  const stickyTopRow = new TilingSprite({
    texture: tile,
    width: gridWidth - CELL_WIDTH,
    height: CELL_HEIGHT,
    position: { x: CELL_WIDTH, y: 0 },
  });

  return stickyTopRow;
}

function createStickyTopLeftCell(tile: RenderTexture): TilingSprite {
  const stickyTopLeftCell = new TilingSprite({
    texture: tile,
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    position: { x: 0, y: 0 },
  });

  return stickyTopLeftCell;
}

export function createGridTilingSprites(app: Application, gridWidth: number, gridHeight: number) {
  const tile = createTile(app);
  const mainScrollableGrid = createMainScrollableGrid(gridWidth, gridHeight, tile);
  const stickyLeftColumn = createStickyLeftColumn(gridHeight, tile);
  const stickyTopRow = createStickyTopRow(gridWidth, tile);
  const stickyTopLeftCell = createStickyTopLeftCell(tile);

  return { mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell };
}
