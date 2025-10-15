import { Application, Container, Text } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Baker } from "../util/Baker";
import { EventBody } from "../ui/event/EventBody";
import { EventSpanType, EventsUtil } from "../util/Events";
import { Tile } from "../ui/Tile";
import { FirstCellNotPinned } from "../ui/event/FirstCellNotPinned";
import { CellEditor } from "../util/CellEditor";
import { Graphics, Sprite } from "pixi.js";
import { TruckIcon } from "../ui/event/TruckIcon";
import { DateTime } from "luxon";
import { Bleacher, DashboardEvent } from "../types";
import { useSelectedBlockStore } from "../state/useSelectedBlock";

/**
 * CellRenderer for the main scrollable grid area
 * Renders cells with event spans when events are present
 *
 * This renderer BUILDS cell content by composing UI components from src/features/dashboard/ui/
 * The Grid handles automatic baking and caching for performance
 */
export class MainGridCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private spansByRow: EventSpanType[][];
  private bleachers: Bleacher[];
  private events?: DashboardEvent[];
  private dates: string[];
  private currentScrollX: number = 0;
  private cellWidth: number = 0; // Store the cell width from main grid
  private cellEditor?: CellEditor; // Cell editor instance
  private yAxis: "Bleachers" | "Events" = "Bleachers";

  private onWorkTrackerSelect?: (workTracker: {
    work_tracker_id: number;
    bleacher_id: number;
    date: string;
  }) => void;

  constructor(
    app: Application,
    bleachers: Bleacher[],
    events: DashboardEvent[],
    dates: string[],
    yAxis: "Bleachers" | "Events",
    opts?: {
      onWorkTrackerSelect?: (workTracker: {
        work_tracker_id: number;
        bleacher_id: number;
        date: string;
      }) => void;
    }
  ) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.events = events;
    this.dates = dates;
    this.onWorkTrackerSelect = opts?.onWorkTrackerSelect;
    this.yAxis = yAxis;

    // Calculate event spans once during construction depending on yAxis
    if (yAxis === "Bleachers") {
      const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, dates);
      this.spansByRow = spansByRow;
    } else {
      this.spansByRow = this.calculateSpansByEvents(events, dates);
    }
  }

  /**
   * When yAxis = "Events", build spans per event row using DashboardEvent
   */
  private calculateSpansByEvents(events: DashboardEvent[], dates: string[]): EventSpanType[][] {
    const dateToIndex = new Map(dates.map((d, i) => [d, i]));
    return events.map((ev, rowIndex) => {
      const spans: EventSpanType[] = [];
      const startISO = DateTime.fromISO(ev.eventStart).toISODate();
      const endISO = DateTime.fromISO(ev.eventEnd).toISODate();
      if (!startISO || !endISO) return spans;
      const startCol = dateToIndex.get(startISO);
      const endCol = dateToIndex.get(endISO);
      if (startCol === undefined || endCol === undefined) return spans;

      // Map DashboardEvent to BleacherEvent-like object (only needed fields)
      const be = {
        eventId: ev.eventId,
        bleacherEventId: ev.bleacherEventId ?? -1,
        eventName: ev.eventName,
        address: ev.addressData?.address ?? "",
        eventStart: ev.eventStart,
        eventEnd: ev.eventEnd,
        hslHue: ev.hslHue ?? null,
        booked: (ev.status ?? ev.selectedStatus) === "Booked",
        goodshuffleUrl: ev.goodshuffleUrl ?? null,
      } as any; // compatible with BleacherEvent used by EventBody

      spans.push({ start: startCol, end: endCol, ev: be, rowIndex });
      return spans;
    });
  }

  /**
   * Set the cell editor instance
   */
  setCellEditor(cellEditor: CellEditor) {
    this.cellEditor = cellEditor;
  }

  /**
   * Update the current scroll position and cell width from the main grid
   * This should be called whenever the main grid scrolls horizontally
   */
  updateScrollPosition(scrollX: number, mainGridCellWidth: number) {
    this.currentScrollX = scrollX;
    this.cellWidth = mainGridCellWidth;
  }

  /**
   * Build cell content by composing UI components
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(
    row: number,
    col: number,
    cellWidth: number,
    cellHeight: number,
    parent: Container,
    firstVisibleColumn?: number
  ): Container {
    // PERFORMANCE CRITICAL: Reuse existing container instead of creating new one
    // Clear existing children efficiently
    parent.removeChildren();

    const dimensions = { width: cellWidth, height: cellHeight };
    parent.zIndex = 0;

    // Check if this cell has an event (bleachers or events mode)
    const eventInfo = EventsUtil.getCellEventInfo(row, col, this.spansByRow);

    if (eventInfo.hasEvent && eventInfo.span) {
      // Use passed firstVisibleColumn or calculate from current scroll position
      const currentFirstVisibleColumn =
        firstVisibleColumn ?? Math.floor(this.currentScrollX / (this.cellWidth || 1));

      // Check if THIS specific event should be pinned
      const thisEventShouldBePinned = EventsUtil.shouldEventBePinned(
        eventInfo.span,
        currentFirstVisibleColumn
      );

      if (!thisEventShouldBePinned && eventInfo.isStart) {
        // UNPINNED EVENT: Cache the entire container for maximum performance
        parent.zIndex = 1000;

        const firstCell = new FirstCellNotPinned(
          eventInfo,
          currentFirstVisibleColumn,
          col,
          this.app,
          this.baker,
          dimensions
        );
        parent.addChild(firstCell);
      } else {
        // PINNED EVENT OR EVENT BODY: Use separate caching strategy
        parent.zIndex = 100;

        const eventSprite = new EventBody(eventInfo, this.baker, dimensions);
        parent.addChild(eventSprite);
      }
    } else {
      const tile = new Tile(dimensions, this.baker, row, col, this.yAxis === "Bleachers");
      parent.addChild(tile);

      // Attempt to find a block (bleachers mode only)
      const bleacher = this.bleachers[row];
      const date = this.dates[col];
      if (this.yAxis === "Bleachers" && bleacher && date) {
        const block = bleacher.blocks.find((b) => b.date === date);
        if (block && block.text) {
          const labelKey = `block:${bleacher.bleacherId}:${date}:${block.text}`;
          const textSprite = this.baker.getSprite(
            labelKey,
            { width: cellWidth, height: cellHeight },
            (c) => {
              const txt = new Text({
                text: block.text,
                style: { fill: 0x1f2937, fontSize: 12, fontWeight: "500", align: "center" },
              });
              txt.anchor.set(0.5);
              txt.position.set(cellWidth / 2, cellHeight / 2);
              c.addChild(txt);
            }
          );
          // IMPORTANT: add text inside the tile so pointer events bubble to tile
          textSprite.eventMode = "none"; // ensure it does not capture events itself
          tile.addChild(textSprite);
        }

        // Work tracker indicator (truck icon substitute) if a work tracker exists for this date
        const workTracker = bleacher.workTrackers?.find((wt) => wt.date === date);
        if (workTracker) {
          const icon = new TruckIcon(this.baker, () => {
            // Stop block editor from opening when clicking truck icon
            // Instead open WorkTracker modal via callback if provided
            if (this.onWorkTrackerSelect) {
              this.onWorkTrackerSelect({
                work_tracker_id: workTracker.workTrackerId ?? -1,
                bleacher_id: bleacher.bleacherId,
                date,
              });
            } else {
              console.log(
                "Truck icon clicked (no callback) bleacher",
                bleacher.bleacherId,
                "date",
                date
              );
            }
          });
          // Prevent click/tap propagation from icon to tile so CellEditor doesn't open
          icon.eventMode = "static";
          icon.cursor = "pointer";
          icon.on("pointerdown", (e: any) => e.stopPropagation());
          icon.on("pointerup", (e: any) => e.stopPropagation());
          icon.on("pointertap", (e: any) => e.stopPropagation());
          icon.on("click", (e: any) => e.stopPropagation());
          const size = Math.min(cellWidth, cellHeight) * 0.55; // bigger for clarity
          icon.scale.set(size / 16); // base baked size 16
          icon.position.set(cellWidth - size + 4, 2); // top-right padding
          icon.zIndex = 500; // above text
          tile.addChild(icon);
        }
      }

      // Set up click listener for cell editing (after adding children)
      if (this.yAxis === "Bleachers") {
        tile.on("cell:edit-request", (data: { row: number; col: number }) => {
          // If the click originated from a truck icon interaction, the callback will already have fired.
          // We rely on event stopping at the icon level; proceed with block load otherwise.
          this.handleLoadBlock(data.row, data.col);
        });
      }
    }
    return parent;
  }

  private handleLoadBlock(rowIndex: number, columnIndex: number) {
    const store = useSelectedBlockStore.getState();
    const key = `${rowIndex}-${columnIndex}`;
    const bleacher = this.bleachers[rowIndex];
    const date = this.dates[columnIndex];

    if (!bleacher || !date) return;

    // Find existing block for this date (exact match)
    const existingBlock = bleacher.blocks.find((b) => b.date === date);

    store.setField("isOpen", true);
    store.setField("key", key);
    store.setField("blockId", existingBlock?.blockId ?? null);
    store.setField("bleacherId", bleacher.bleacherId);
    store.setField("date", date);
    store.setField("text", existingBlock?.text ?? "");
    // Work tracker integration not yet wired in this data set
    // Attach workTrackerId if it exists for this bleacher/date
    const workTracker = bleacher.workTrackers?.find((wt) => wt.date === date);
    store.setField("workTrackerId", workTracker?.workTrackerId ?? null);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    // this.assetManager.destroy();
  }
}
