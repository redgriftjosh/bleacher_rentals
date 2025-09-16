import { Application, Container, Graphics, TilingSprite } from "pixi.js";
import { Tile } from "./Tile";
import {
  BLEACHER_COLUMN_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
} from "../values/constants";
import { Bleacher } from "../db/client/bleachers";
import { DateTime } from "luxon";
import { EventSpan, EventSpanType } from "./EventSpan";
import { Baker } from "../util/Baker";

export class MainScrollableGrid extends Container {
  private background: TilingSprite;
  private prevFirstVisibleColumn = -1;
  private prevFirstVisibleRow = -1;
  private visibleRows: number;
  private visibleColumns: number;

  private spansLayer: Container;
  private rowSpanPools: EventSpan[][] = [];

  private spansByRow: EventSpanType[][];
  private dateToIndex: Map<string, number>;

  private spanBaker: Baker;

  private wrappedX = 0;

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
    this.dateToIndex = new Map(dates.map((d, i) => [d, i]));

    this.spanBaker = new Baker(app);

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
    this.background.mask = mask;

    this.spansByRow = bleachers.map((b) => {
      const spans: EventSpanType[] = [];
      for (const ev of b.bleacherEvents ?? []) {
        const startISO = DateTime.fromISO(ev.eventStart).startOf("day").toISODate();
        const endISO = DateTime.fromISO(ev.eventEnd).startOf("day").toISODate();
        if (!startISO || !endISO) continue;
        const a = this.dateToIndex.get(startISO);
        const bIdx = this.dateToIndex.get(endISO);
        if (a == null || bIdx == null) continue;
        const start = Math.min(a, bIdx);
        const end = Math.max(a, bIdx);
        spans.push({ start, end, ev });
      }
      spans.sort((x, y) => x.start - y.start);
      return spans;
    });

    // function getEventDays(startISO: string, endISO: string): string[] | undefined {
    //   const start = DateTime.fromISO(startISO).startOf("day");
    //   const end = DateTime.fromISO(endISO).startOf("day");
    //   if (!start.isValid || !end.isValid) return;

    //   // If end is before start, you can swap or just bail; here we bail
    //   if (end.toMillis() < start.toMillis()) return;

    //   const days: string[] = [];
    //   let d = start;
    //   while (d.toMillis() <= end.toMillis()) {
    //     days.push(d.toISODate());
    //     d = d.plus({ days: 1 });
    //   }
    //   return days;
    // }

    this.spansLayer = new Container();
    this.spansLayer.position.set(BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT);
    this.spansLayer.mask = mask;

    // Create one Graphics per visible row to reuse
    for (let r = 0; r < this.visibleRows; r++) {
      this.rowSpanPools.push([]);
    }

    this.addChild(
      this.background,
      mask,
      this.spansLayer
      // this.labels
    );
    // this.mask = mask;

    this.updateY(0);
    this.updateX(0);
  }

  /** Call every time vertical content scroll changes (in pixels). */
  updateY(contentY: number) {
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;

    this.background.tilePosition.y = -wrapped;
    // this.labels.y = HEADER_ROW_HEIGHT - wrapped;
    this.spansLayer.y = HEADER_ROW_HEIGHT - wrapped;

    const firstVisibleRow = Math.floor(contentY / CELL_HEIGHT);
    if (firstVisibleRow === this.prevFirstVisibleRow) {
      // no rebind; just update the pinned label positions
      // this.updatePinnedLabels();
      return;
    }
    this.prevFirstVisibleRow = firstVisibleRow;

    this.rebindEvents(
      this.prevFirstVisibleRow,
      this.prevFirstVisibleColumn < 0 ? 0 : this.prevFirstVisibleColumn
    );
  }

  /** Call every time horizontal content scroll changes (in pixels). */
  updateX(contentX: number) {
    const wrapped = ((contentX % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    this.wrappedX = wrapped;
    this.background.tilePosition.x = -wrapped;
    // this.labels.x = BLEACHER_COLUMN_WIDTH - wrapped;
    this.spansLayer.x = BLEACHER_COLUMN_WIDTH - wrapped;

    const firstVisibleColumn = Math.floor(contentX / CELL_WIDTH);
    if (firstVisibleColumn === this.prevFirstVisibleColumn) {
      // no rebind; just update the pinned label positions
      this.updatePinnedLabels();
      return;
    }
    this.prevFirstVisibleColumn = firstVisibleColumn;

    this.rebindEvents(
      this.prevFirstVisibleRow < 0 ? 0 : this.prevFirstVisibleRow,
      this.prevFirstVisibleColumn
    );
  }

  private updatePinnedLabels() {
    const visStart = this.prevFirstVisibleColumn;
    const w = this.wrappedX;
    // Nudge label x for all currently visible spans
    for (let r = 0; r < this.visibleRows; r++) {
      const pool = this.rowSpanPools[r];
      for (const es of pool) {
        // if (es.visible) es.updatePinnedLabel(0, this.wrappedX);
        if (es.needsPin(visStart, w)) {
          es.updatePinnedLabel(0, w, r * CELL_HEIGHT);
        }
      }
    }
  }

  rebindEvents(firstVisibleRow: number, firstVisibleCol: number) {
    // 2) draw span rectangles (one Graphics per visible row)
    const visStart = firstVisibleCol;
    const visEnd = firstVisibleCol + this.visibleColumns - 1;

    for (let r = 0; r < this.visibleRows; r++) {
      const rowIdx = firstVisibleRow + r;
      const spans = this.spansByRow[rowIdx] ?? [];
      // const eventSpan = this.eventSpanPool[r];

      // count how many spans intersect the visible window
      let needed = 0;
      for (const s of spans) {
        if (s.end >= visStart && s.start <= visEnd) needed++;
      }

      // ensure pool has enough instances
      const pool = this.rowSpanPools[r];
      while (pool.length < needed) {
        const es = new EventSpan(this.spanBaker);
        this.spansLayer.addChild(es);
        pool.push(es);
      }

      // while (pool.length < needed) {
      //   const es = new EventSpan();
      //   this.spansLayer.addChild(es);
      //   pool.push(es);
      // }

      // draw the visible spans
      let used = 0;
      for (const s of spans) {
        if (s.end < visStart || s.start > visEnd) continue;
        const es = pool[used++];
        es.draw(s, visStart, visEnd, r * CELL_HEIGHT, this.wrappedX);

        // Immediately pin if needed on this rebind
        if (es.needsPin(visStart, this.wrappedX)) {
          es.updatePinnedLabel(0, this.wrappedX, r * CELL_HEIGHT);
        }
      }

      // hide any unused pooled spans this frame
      for (let i = used; i < pool.length; i++) {
        pool[i].hide();
      }
    }
  }
}
