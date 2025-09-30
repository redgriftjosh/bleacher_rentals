import { Application, Container, FederatedPointerEvent, Graphics, TilingSprite } from "pixi.js";
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
import { useSelectedBlockStore } from "../state/useSelectedBlock";

export class MainScrollableGrid extends Container {
  private background: TilingSprite;
  private currentHoverCell: { row: number; col: number } | null = null;
  private prevFirstVisibleColumn = -1;
  private prevFirstVisibleRow = -1;
  private visibleRows: number;
  private visibleColumns: number;
  public destroyed = false; // Add destroyed flag for defensive checks

  private spansLayer: Container;
  private rowSpanPools: EventSpan[][] = [];

  private spansByRow: EventSpanType[][];
  private dateToIndex: Map<string, number>;

  private spanBaker: Baker;

  private wrappedX = 0;

  // Store bleachers and dates for cell editor
  private bleachers: Bleacher[];
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
    this.dateToIndex = new Map(dates.map((d, i) => [d, i]));

    // Store for cell editor
    this.bleachers = bleachers;
    this.dates = dates;

    this.eventMode = "static";

    // Add click handler
    this.on("pointerup", this.onPointerUp.bind(this, app));

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

    this.spansLayer = new Container();
    this.spansLayer.position.set(BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT);
    this.spansLayer.mask = mask;

    // Create one Graphics per visible row to reuse
    for (let r = 0; r < this.visibleRows; r++) {
      this.rowSpanPools.push([]);
    }

    this.addChild(this.background, mask, this.spansLayer);
    // this.mask = mask;

    this.updateY(0);
    this.updateX(0);
  }

  private onPointerUp(app: Application, e: FederatedPointerEvent) {
    // Convert to CSS pixels relative to the canvas
    console.log("onPointerDown", e);
    const rect = app.canvas.getBoundingClientRect();
    const cx = e.clientX ?? e.global?.x ?? 0;
    const cy = e.clientY ?? e.global?.y ?? 0;

    const x = cx - rect.left;
    const y = cy - rect.top;

    // Calculate which cell was clicked
    const localPos = this.toLocal(e.global);
    const adjustedX = localPos.x - BLEACHER_COLUMN_WIDTH + this.background.tilePosition.x;
    const adjustedY = localPos.y - HEADER_ROW_HEIGHT + this.background.tilePosition.y;

    const col = Math.floor(adjustedX / CELL_WIDTH);
    const row = Math.floor(adjustedY / CELL_HEIGHT);

    // Get the actual row and column indices accounting for scroll
    const actualRow = this.prevFirstVisibleRow + row;
    const actualCol = this.prevFirstVisibleColumn + col;

    console.log("Clicked cell - row:", actualRow, "col:", actualCol);

    // Open the cell editor
    this.handleLoadBlock(actualRow, actualCol);
  }

  private handleLoadBlock(rowIndex: number, columnIndex: number) {
    // TODO: Implement logic to get block/workTracker data for the cell
    // For now, create a basic block structure
    const store = useSelectedBlockStore.getState();

    // Generate a key for this cell
    const key = `${rowIndex}-${columnIndex}`;

    // Get the actual bleacher and date
    const bleacher = this.bleachers[rowIndex];
    const date = this.dates[columnIndex];

    store.setField("isOpen", true);
    store.setField("key", key);
    store.setField("blockId", null); // Set to actual block ID if it exists
    store.setField("bleacherId", bleacher?.bleacherId || rowIndex + 1);
    store.setField("date", date || "2025-01-01");
    store.setField("text", ""); // TODO: Get actual text if block exists
    store.setField("workTrackerId", null); // TODO: Get actual work tracker ID if it exists
  }

  /** Call every time vertical content scroll changes (in pixels). */
  updateY(contentY: number) {
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;

    this.background.tilePosition.y = -wrapped;
    this.spansLayer.y = HEADER_ROW_HEIGHT - wrapped;

    const firstVisibleRow = Math.floor(contentY / CELL_HEIGHT);
    if (firstVisibleRow === this.prevFirstVisibleRow) {
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
    this.spansLayer.x = BLEACHER_COLUMN_WIDTH - wrapped;

    const firstVisibleColumn = Math.floor(contentX / CELL_WIDTH);
    if (firstVisibleColumn === this.prevFirstVisibleColumn) {
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
    // Add defensive check to prevent operations on destroyed objects
    if (this.destroyed || !this.spansLayer || this.spansLayer.destroyed) {
      console.warn("MainScrollableGrid: Attempting to rebind events on destroyed object");
      return;
    }

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
      if (!pool) continue; // Defensive check

      while (pool.length < needed) {
        try {
          const es = new EventSpan(this.spanBaker);
          // es.hide();
          if (this.spansLayer && !this.spansLayer.destroyed) {
            this.spansLayer.addChild(es);
            pool.push(es);
          }
        } catch (error) {
          console.warn("Error creating EventSpan:", error);
          break;
        }
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

        // Defensive check before drawing
        if (es && typeof es.draw === "function" && !es.destroyed) {
          try {
            es.draw(s, visStart, visEnd, r * CELL_HEIGHT, this.wrappedX);

            // Immediately pin if needed on this rebind
            if (
              es.needsPin &&
              typeof es.needsPin === "function" &&
              es.needsPin(visStart, this.wrappedX)
            ) {
              if (es.updatePinnedLabel && typeof es.updatePinnedLabel === "function") {
                es.updatePinnedLabel(0, this.wrappedX, r * CELL_HEIGHT);
              }
            }
          } catch (error) {
            console.warn("Error drawing EventSpan:", error);
            if (es && typeof es.hide === "function") {
              try {
                es.hide();
              } catch (hideError) {
                console.warn("Error hiding EventSpan after draw error:", hideError);
              }
            }
          }
        }
      }

      // hide any unused pooled spans this frame
      for (let i = used; i < pool.length; i++) {
        const es = pool[i];
        if (es && typeof es.hide === "function" && !es.destroyed) {
          try {
            es.hide();
          } catch (error) {
            console.warn("Error hiding EventSpan:", error);
          }
        }
      }
    }
  }

  destroy(options?: Parameters<Container["destroy"]>[0]) {
    if (this.destroyed) return;

    this.destroyed = true;

    // Clean up EventSpan pools
    for (const pool of this.rowSpanPools) {
      for (const es of pool) {
        if (es && typeof es.destroy === "function" && !es.destroyed) {
          try {
            es.destroy();
          } catch (error) {
            console.warn("Error destroying EventSpan from pool:", error);
          }
        }
      }
    }
    this.rowSpanPools = [];

    // Clean up spans layer
    if (
      this.spansLayer &&
      typeof this.spansLayer.destroy === "function" &&
      !this.spansLayer.destroyed
    ) {
      try {
        this.spansLayer.destroy({ children: true });
      } catch (error) {
        console.warn("Error destroying spans layer:", error);
      }
    }

    // Clean up background
    if (
      this.background &&
      typeof this.background.destroy === "function" &&
      !this.background.destroyed
    ) {
      try {
        this.background.destroy();
      } catch (error) {
        console.warn("Error destroying background:", error);
      }
    }

    // Call parent destroy
    try {
      super.destroy(options);
    } catch (error) {
      console.warn("Error in parent destroy:", error);
    }
  }
}
