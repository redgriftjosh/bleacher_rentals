import { Application, Container, Graphics, Text } from "pixi.js";
import {
  BLEACHER_COLUMN_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
  THUMB_LENGTH,
} from "../../values/constants";
import { getGridSize } from "../../values/dynamic";
import { Bleacher, BleacherEvent } from "../../db/client/bleachers";
import { createGridTilingSprites } from "./createGridTilingSprites";
import { getColumnsAndDates } from "../../util/scrollbar";
import { HeaderCell } from "../ui/HeaderCell";
import { DateTime } from "luxon";
import { BleacherCell } from "../ui/BleacherCell";
import { EventCell } from "../ui/EventCell";

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
    .rect(0, 0, BLEACHER_COLUMN_WIDTH, gridHeight - HEADER_ROW_HEIGHT)
    .fill(0xffffff);
  stickyLeftColumn.addChild(stickyLeftColumnMask);
  // stickyLeftColumn.mask = stickyLeftColumnMask;

  const mainScrollableGridMask = new Graphics()
    .rect(0, 0, gridWidth - BLEACHER_COLUMN_WIDTH, gridHeight - HEADER_ROW_HEIGHT)
    .fill(0xffffff);
  mainScrollableGrid.addChild(mainScrollableGridMask);
  // mainScrollableGrid.mask = mainScrollableGridMask;

  // ====== EVENTS ======
  const rows = bleachers.length;
  const viewportH = gridHeight - CELL_HEIGHT; // visible area under header
  const visibleRows = Math.min(rows, Math.ceil(viewportH / CELL_HEIGHT) + 1);

  const { columns, dates } = getColumnsAndDates();
  const viewportW = gridWidth - CELL_WIDTH; // visible to the right of sticky left column
  const visibleColumns = Math.min(columns, Math.ceil(viewportW / CELL_WIDTH) + 0);

  const eventsByRow: Map<string, BleacherEvent>[] = bleachers.map((b) => {
    const m = new Map<string, BleacherEvent>();
    for (const ev of b.bleacherEvents ?? []) {
      // normalize to ISO date (yyyy-mm-dd) so it matches your column keys
      const key = DateTime.fromISO(ev.eventStart).toISODate();
      // if multiple events share same start date, keep the first or choose a rule
      if (key && !m.has(key)) m.set(key, ev);
    }
    return m;
  });

  // Body layer that scrolls both directions (masked to viewport)
  const eventsLayer = new Container();
  eventsLayer.position.set(BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT);
  gridContainer.addChild(eventsLayer);
  eventsLayer.mask = mainScrollableGridMask;

  // Pool: worst case one label per visible cell
  // const maxEventLabels = visibleRows * visibleColumns;
  const eventPool: EventCell[] = [];
  for (let r = 0; r < visibleRows; r++) {
    for (let c = 0; c < visibleColumns; c++) {
      const eventCell = new EventCell();
      eventCell.x = c * CELL_WIDTH;
      eventCell.y = r * CELL_HEIGHT;
      eventsLayer.addChild(eventCell);
      eventPool.push(eventCell);
    }
  }

  // ====== DATES ======
  const contentW = columns * CELL_WIDTH; // total scrollable content width
  const xThumbTravel = Math.max(1, gridWidth - THUMB_LENGTH);
  const xContentMax = Math.max(0, contentW - viewportW);

  // labels layer (sticks vertically, scrolls horizontally)
  const topLabels = new Container();
  topLabels.position.set(CELL_WIDTH, 0); // start under header
  gridContainer.addChild(topLabels);
  topLabels.mask = stickyTopRowMask;
  let lastFirstCol = -1;
  let lastFirstRow = -1;
  let curWrappedX = 0;
  let curWrappedY = 0;
  let curFirstCol = -1;
  let curFirstRow = -1;
  const todayISO = DateTime.now().toISODate();

  const xPool: HeaderCell[] = [];
  // there will be like 10 visible columns depending on screen size. this has been calculated above so don't worry about it
  // visibleColumns is like 10 or something. Not the total number of columns.
  for (let i = 0; i < visibleColumns; i++) {
    // so I guess we're gonna make like 10 cells
    const cell = new HeaderCell();
    // and then each cell side by size.
    cell.x = i * CELL_WIDTH; // container’s local x, y
    // y axis doesn't change
    cell.y = 0;
    // add it each cell to the container
    topLabels.addChild(cell);
    // add each cell to the pool of vizible cells
    xPool.push(cell);
  }

  xUpdateLabels(0);

  function rebindEvents(firstRow: number, firstCol: number) {
    for (let r = 0; r < visibleRows; r++) {
      const rowIdx = firstRow + r;
      const rowMap = eventsByRow[rowIdx];

      for (let c = 0; c < visibleColumns; c++) {
        const colIdx = firstCol + c;
        const poolIdx = r * visibleColumns + c;
        const cell = eventPool[poolIdx];

        // Out of data bounds?
        if (rowIdx < 0 || rowIdx >= rows || colIdx < 0 || colIdx >= columns) {
          cell.visible = false;
          continue;
        }

        cell.visible = true;

        // Lookup by ISO date
        const dateISO = dates[colIdx];
        const ev = rowMap?.get(dateISO);

        if (ev) {
          cell.setText(ev.eventName); // show event
          // (optional) style for “has event”
          // cell.setHighlighted(true);
        } else {
          cell.setText(""); // or hide if you prefer
          // cell.visible = false;
          // cell.setHighlighted(false);
        }
      }
    }
  }

  // ====== DATA → labels in sticky left column ======
  const contentH = rows * CELL_HEIGHT; // total scrollable content height
  const yThumbTravel = Math.max(1, gridHeight - THUMB_LENGTH);
  const yContentMax = Math.max(0, contentH - viewportH);

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
    eventsLayer.y = HEADER_ROW_HEIGHT - wrapped;

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
        bleachers[row].bleacherNumber,
        bleachers[row].bleacherRows,
        bleachers[row].bleacherSeats,
        bleachers[row].summerHomeBase,
        bleachers[row].winterHomeBase
      );
      // t.y stays at i*CELL_HEIGHT + CELL_HEIGHT/2 (we’re moving the container instead)
    }

    rebindEvents(lastFirstRow, lastFirstCol < 0 ? 0 : lastFirstCol);
  }

  function xUpdateLabels(contentX: number) {
    // contentX is the number of pixels we have scrolled from the left
    // every time we scroll an full cell width, we reset the wrapped value to 0 so that the grid pattern starts over.
    // if we're like 1.5 cells in, we want to show the grid pattern starting at 0.5 cells in.
    // this is important because with many columns the grid lines can develop some weird artifacts
    const wrapped = ((contentX % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH; // always between 0 and CELL_WIDTH
    mainScrollableGrid.tilePosition.x = -wrapped;
    stickyTopRow.tilePosition.x = -wrapped;
    topLabels.x = BLEACHER_COLUMN_WIDTH - wrapped;
    eventsLayer.x = BLEACHER_COLUMN_WIDTH - wrapped;
    // the topLabels position is always the same as the tilingTexture but what we display changes as we scroll.

    // the first visible column. This is an index so if we're on column 80 then 80 is the first visible column.
    // So We'll only display the labels starting at index 80 and going to index 80 + visibleColumns
    const first = Math.floor(contentX / CELL_WIDTH);

    // This whole function runs every frame, so if we haven't yet scrolled to a new column we're not going to
    // recalculate what needs to be shown.
    if (first === lastFirstCol) return; // <- early out, nothing to rebind
    lastFirstCol = first;

    // we specified how many columns we're holding in this pool in the pools declaration.
    // now we're just looping the number of values in thie array.
    // the pool is really a list of lables (Containers) and I'm pretty sure that the goal is to just display the right
    // info on the first visible column. this changes every time we scroll past a column in either direction.

    // so we're looping through all of the labels every time we scroll past a column.
    // the labels are already positioned correctly, we just need to set the text and visibility.

    for (let i = 0; i < xPool.length; i++) {
      const col = first + i; // if we're on col 80 this will be 81
      const cell = xPool[i]; // first item in the pool

      // I don't think this is important.
      // if (col < 0 || col >= columns) {
      //   cell.visible = false;
      //   continue;
      // }
      // cell.visible = true;
      cell.setDateISO(dates[col], todayISO);
    }

    // for (let i = 0; i < eventPool.length; i++) {
    //   const col = first + i;
    //   const cell = eventPool[i];
    //   cell.setText("Hello");
    // }
    rebindEvents(lastFirstRow < 0 ? 0 : lastFirstRow, lastFirstCol);
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
