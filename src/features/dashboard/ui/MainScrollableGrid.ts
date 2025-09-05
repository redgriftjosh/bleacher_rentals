import { Application, Container, Graphics, TilingSprite } from "pixi.js";
import { Tile } from "./Tile";
import {
  BLEACHER_COLUMN_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
} from "../values/constants";
import { Bleacher, BleacherEvent } from "../db/client/bleachers";
import { DateTime } from "luxon";
import { EventCell } from "./EventCell";

export class MainScrollableGrid extends Container {
  private background: TilingSprite;
  private labels: Container;
  private prevFirstVisibleColumn = -1;
  private prevFirstVisibleRow = -1;
  private labelPool: EventCell[] = [];
  private visibleRows: number;
  private visibleColumns: number;
  private eventsByRow: Map<string, BleacherEvent>[];
  private dates: string[];

  constructor(
    app: Application,
    gridWidth: number,
    gridHeight: number,
    bleachers: Bleacher[],
    visibleRows: number,
    visibleColumns: number,
    dates: string[]
  ) {
    super();
    this.visibleRows = visibleRows;
    this.visibleColumns = visibleColumns;
    this.dates = dates;

    const tile = new Tile(app, { width: CELL_WIDTH, height: CELL_HEIGHT }).texture;

    this.background = new TilingSprite({
      texture: tile,
      width: gridWidth - BLEACHER_COLUMN_WIDTH,
      height: gridHeight - HEADER_ROW_HEIGHT,
      position: { x: BLEACHER_COLUMN_WIDTH, y: HEADER_ROW_HEIGHT },
    });

    const mask = new Graphics()
      .rect(
        BLEACHER_COLUMN_WIDTH,
        HEADER_ROW_HEIGHT,
        gridWidth - BLEACHER_COLUMN_WIDTH,
        gridHeight - HEADER_ROW_HEIGHT
      )
      .fill(0xffffff);
    this.background.addChild(this.background);
    this.background.mask = mask;

    this.labels = new Container();
    this.labels.position.set(BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT);
    this.labels.mask = mask;

    this.eventsByRow = bleachers.map((b) => {
      const m = new Map<string, BleacherEvent>();
      for (const ev of b.bleacherEvents ?? []) {
        // normalize to ISO date (yyyy-mm-dd) so it matches your column keys
        const key = DateTime.fromISO(ev.eventStart).toISODate();
        // if multiple events share same start date, keep the first or choose a rule
        if (key && !m.has(key)) m.set(key, ev);
      }
      return m;
    });

    for (let r = 0; r < this.visibleRows; r++) {
      for (let c = 0; c < this.visibleColumns; c++) {
        const eventCell = new EventCell();
        eventCell.x = c * CELL_WIDTH;
        eventCell.y = r * CELL_HEIGHT;
        this.labels.addChild(eventCell);
        this.labelPool.push(eventCell);
      }
    }

    this.addChild(this.background, mask, this.labels);
    this.mask = mask;

    this.updateY(0);
    this.updateX(0);
  }

  /** Call every time vertical content scroll changes (in pixels). */
  updateY(contentY: number) {
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;

    this.background.tilePosition.y = -wrapped;
    this.labels.y = HEADER_ROW_HEIGHT - wrapped;

    const firstVisibleRow = Math.floor(contentY / CELL_HEIGHT);
    if (firstVisibleRow === this.prevFirstVisibleRow) return;
    this.prevFirstVisibleRow = firstVisibleRow;

    this.rebindEvents(
      this.prevFirstVisibleRow,
      this.prevFirstVisibleColumn < 0 ? 0 : this.prevFirstVisibleColumn
    );
  }

  /** Call every time horizontal content scroll changes (in pixels). */
  updateX(contentX: number) {
    const wrapped = ((contentX % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    this.background.tilePosition.x = -wrapped;
    this.labels.x = BLEACHER_COLUMN_WIDTH - wrapped;

    const firstVisibleColumn = Math.floor(contentX / CELL_WIDTH);
    if (firstVisibleColumn === this.prevFirstVisibleColumn) return;
    this.prevFirstVisibleColumn = firstVisibleColumn;

    this.rebindEvents(
      this.prevFirstVisibleRow < 0 ? 0 : this.prevFirstVisibleRow,
      this.prevFirstVisibleColumn
    );
  }

  rebindEvents(firstRow: number, firstCol: number) {
    for (let r = 0; r < this.visibleRows; r++) {
      const rowIdx = firstRow + r;
      const rowMap = this.eventsByRow[rowIdx];

      for (let c = 0; c < this.visibleColumns; c++) {
        const colIdx = firstCol + c;
        const poolIdx = r * this.visibleColumns + c;
        const cell = this.labelPool[poolIdx];

        //   if (c < 0 || c >= columns) {
        //   cell.visible = false;
        //   continue;
        // }

        // cell.visible = true;

        // Lookup by ISO date
        const dateISO = this.dates[colIdx];
        const ev = rowMap?.get(dateISO);

        if (ev) {
          cell.visible = true;
          cell.setText(ev.eventName); // show event
          // (optional) style for “has event”
          // cell.setHighlighted(true);
        } else {
          // cell.setText(""); // or hide if you prefer
          cell.visible = false;
          // cell.setHighlighted(false);
        }
      }
    }
  }
}
