import { Application, Container, Text } from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH, THUMB_LENGTH } from "../../values/constants";
import { getGridSize } from "../../values/dynamic";
import { Bleacher } from "../../db/client/bleachers";
import { createGridTilingSprites } from "./createGridTilingSprites";
import { getColumnsAndDates } from "../../util/scrollbar";

export function grid(app: Application, bleachers: Bleacher[]) {
  const { gridWidth, gridHeight } = getGridSize(app);

  const gridContainer = new Container();
  app.stage.addChild(gridContainer);

  const { mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell } =
    createGridTilingSprites(app, gridWidth, gridHeight);
  gridContainer.addChild(mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell);

  // ====== DATES ======
  const { columns, dates } = getColumnsAndDates();
  const viewportW = gridWidth - CELL_WIDTH; // visible to the right of sticky left column
  const contentW = columns * CELL_WIDTH; // total scrollable content width
  const xThumbTravel = Math.max(1, gridWidth - THUMB_LENGTH);
  const xContentMax = Math.max(0, contentW - viewportW);
  const visibleColumns = Math.min(columns, Math.ceil(viewportW / CELL_WIDTH) + 2);

  // labels layer (sticks vertically, scrolls horizontally)
  const topLabels = new Container();
  topLabels.position.set(CELL_WIDTH, 0); // start under header
  gridContainer.addChild(topLabels);

  const xPool: Text[] = [];
  for (let i = 0; i < visibleColumns; i++) {
    const t = new Text({ text: "", style: { fill: 0x333333, fontSize: 14, align: "center" } });
    t.anchor.set(0.5);
    t.x = i * CELL_WIDTH + CELL_WIDTH / 2;
    t.y = CELL_HEIGHT / 2;
    topLabels.addChild(t);
    xPool.push(t);
  }

  // ====== DATA → labels in sticky left column ======
  const rows = bleachers.length;
  const viewportH = gridHeight - CELL_HEIGHT; // visible area under header
  const contentH = rows * CELL_HEIGHT; // total scrollable content height
  const yThumbTravel = Math.max(1, gridHeight - THUMB_LENGTH);
  const yContentMax = Math.max(0, contentH - viewportH);
  const visibleRows = Math.min(rows, Math.ceil(viewportH / CELL_HEIGHT) + 2);

  // labels layer (sticks horizontally, scrolls vertically)
  const leftLabels = new Container();
  leftLabels.position.set(0, CELL_HEIGHT); // start under header
  gridContainer.addChild(leftLabels);

  const yPool: Text[] = [];
  for (let i = 0; i < visibleRows; i++) {
    const t = new Text({ text: "", style: { fill: 0x333333, fontSize: 14, align: "center" } });
    t.anchor.set(0.5);
    t.x = CELL_WIDTH / 2;
    t.y = i * CELL_HEIGHT + CELL_HEIGHT / 2; // relative within the pool
    leftLabels.addChild(t);
    yPool.push(t);
  }

  function yUpdateLabels(contentY: number) {
    // wrap grid pattern so UVs stay small (no shimmer)
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;
    mainScrollableGrid.tilePosition.y = -wrapped;
    stickyLeftColumn.tilePosition.y = -wrapped;

    // position label layer by phase only…
    leftLabels.y = CELL_HEIGHT - wrapped;

    // …and compute which data rows are visible
    const first = Math.floor(contentY / CELL_HEIGHT);
    for (let i = 0; i < yPool.length; i++) {
      const row = first + i;
      const t = yPool[i];
      if (row < 0 || row >= rows) {
        t.visible = false;
        continue;
      }
      t.visible = true;
      t.text = String(bleachers[row].bleacher_number);
      // t.y stays at i*CELL_HEIGHT + CELL_HEIGHT/2 (we’re moving the container instead)
    }
  }

  function xUpdateLabels(contentX: number) {
    // wrap grid pattern so UVs stay small (no shimmer)
    const wrapped = ((contentX % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    mainScrollableGrid.tilePosition.x = -wrapped;
    stickyTopRow.tilePosition.x = -wrapped;

    // position label layer by phase only…
    topLabels.x = CELL_WIDTH + -wrapped;

    // …and compute which data rows are visible
    const first = Math.floor(contentX / CELL_WIDTH);
    for (let i = 0; i < xPool.length; i++) {
      const col = first + i;
      const t = xPool[i];
      if (col < 0 || col >= columns) {
        t.visible = false;
        continue;
      }
      t.visible = true;
      t.text = dates[col];
      // t.y stays at i*CELL_HEIGHT + CELL_HEIGHT/2 (we’re moving the container instead)
    }
  }

  app.stage.on("hscroll:ny", (thumbY: number) => {
    const ratio = thumbY / yThumbTravel;
    const contentY = Math.round(ratio * yContentMax);

    yUpdateLabels(contentY);
  });

  app.stage.on("hscroll:nx", (thumbX: number) => {
    const ratio = thumbX / xThumbTravel;
    const contentX = Math.round(ratio * xContentMax);

    xUpdateLabels(contentX);
  });
}
