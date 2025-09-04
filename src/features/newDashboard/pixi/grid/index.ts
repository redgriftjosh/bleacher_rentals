import { Application, Container, Graphics, Text } from "pixi.js";
import {
  BLEACHER_COLUMN_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
  THUMB_LENGTH,
} from "../../values/constants";
import { getGridSize } from "../../values/dynamic";
import { Bleacher } from "../../db/client/bleachers";
import { createGridTilingSprites } from "./createGridTilingSprites";
import { getColumnsAndDates } from "../../util/scrollbar";
import { HeaderCell } from "../ui/HeaderCell";
import { DateTime } from "luxon";
import { BleacherCell } from "../ui/BleacherCell";

export function grid(app: Application, bleachers: Bleacher[]) {
  const { gridWidth, gridHeight } = getGridSize(app);

  const gridContainer = new Container();
  app.stage.addChild(gridContainer);

  const { mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell } =
    createGridTilingSprites(app, gridWidth, gridHeight);
  gridContainer.addChild(mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell);

  const stickyTopRowMask = new Graphics()
    .rect(0, 0, gridWidth - BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT)
    .fill(0xffffff);
  stickyTopRow.addChild(stickyTopRowMask);
  stickyTopRow.mask = stickyTopRowMask;

  const stickyLeftColumnMask = new Graphics()
    .rect(0, HEADER_ROW_HEIGHT, BLEACHER_COLUMN_WIDTH, gridHeight - HEADER_ROW_HEIGHT)
    .fill(0xffffff);
  stickyTopRow.addChild(stickyTopRowMask);
  stickyTopRow.mask = stickyTopRowMask;

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
  topLabels.mask = stickyTopRowMask;
  let lastFirstCol = -1;
  let lastFirstRow = -1;
  const todayISO = DateTime.now().toISODate();

  const xPool: HeaderCell[] = [];
  for (let i = 0; i < visibleColumns; i++) {
    // const t = new Text({ text: "", style: { fill: 0x333333, fontSize: 14, align: "center" } });
    // t.anchor.set(0.5);
    // t.x = i * CELL_WIDTH + CELL_WIDTH / 2;
    // t.y = CELL_HEIGHT / 2;
    const cell = new HeaderCell();
    cell.x = i * CELL_WIDTH; // container’s local x, y
    cell.y = 0;
    topLabels.addChild(cell);
    xPool.push(cell);
  }
  xUpdateLabels(0);

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
  leftLabels.mask = stickyLeftColumnMask;

  const yPool: BleacherCell[] = [];
  for (let i = 0; i < visibleRows; i++) {
    // const t = new Text({ text: "", style: { fill: 0x333333, fontSize: 14, align: "center" } });
    // t.anchor.set(0.5);
    // t.x = CELL_WIDTH / 2;
    // t.y = i * CELL_HEIGHT + CELL_HEIGHT / 2; // relative within the pool
    // leftLabels.addChild(t);
    // yPool.push(t);
    const cell = new BleacherCell();
    cell.x = 0;
    cell.y = i * CELL_HEIGHT;
    leftLabels.addChild(cell);
    yPool.push(cell);
  }
  yUpdateLabels(0);

  function yUpdateLabels(contentY: number) {
    // wrap grid pattern so UVs stay small (no shimmer)
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;
    mainScrollableGrid.tilePosition.y = -wrapped;
    stickyLeftColumn.tilePosition.y = -wrapped;
    leftLabels.y = HEADER_ROW_HEIGHT - wrapped;

    const first = Math.floor(contentY / CELL_HEIGHT);
    if (first === lastFirstRow) return; // <- early out, nothing to rebind
    lastFirstRow = first;

    for (let i = 0; i < yPool.length; i++) {
      const row = first + i;
      const cell = yPool[i];
      if (row < 0 || row >= rows) {
        cell.visible = false;
        continue;
      }
      cell.visible = true;
      // t.text = String(bleachers[row].bleacher_number);
      cell.setText(
        bleachers[row].bleacher_number,
        bleachers[row].bleacher_rows,
        bleachers[row].bleacher_seats,
        bleachers[row].summer_home_base,
        bleachers[row].winter_home_base
      );
      // t.y stays at i*CELL_HEIGHT + CELL_HEIGHT/2 (we’re moving the container instead)
    }
  }

  function xUpdateLabels(contentX: number) {
    // wrap grid pattern so UVs stay small (no shimmer)
    const wrapped = ((contentX % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    mainScrollableGrid.tilePosition.x = -wrapped;
    stickyTopRow.tilePosition.x = -wrapped;
    topLabels.x = BLEACHER_COLUMN_WIDTH + -wrapped;

    const first = Math.floor(contentX / CELL_WIDTH);
    if (first === lastFirstCol) return; // <- early out, nothing to rebind
    lastFirstCol = first;

    for (let i = 0; i < xPool.length; i++) {
      const col = first + i;
      const cell = xPool[i];
      if (col < 0 || col >= columns) {
        cell.visible = false;
        continue;
      }
      cell.visible = true;
      cell.setDateISO(dates[col], todayISO);
      // t.text = dates[col];
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
