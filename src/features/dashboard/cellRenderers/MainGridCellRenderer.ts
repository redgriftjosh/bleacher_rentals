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
import { useDashboardBleachersStore } from "../state/useDashboardBleachersStore";
import { useSelectedBlockStore } from "../state/useSelectedBlock";
import { useWorkTrackerSelectionStore } from "@/features/workTrackers/state/useWorkTrackerSelectionStore";
import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";

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
  private visibleCells: Map<
    string,
    { parent: Container; w: number; h: number; firstVisibleColumn?: number }
  > = new Map();
  private unsubBleachers?: () => void;
  // Maintain a stable mapping from row index -> bleacherId (from initial input)
  private rowBleacherUuids: string[];
  // Always-up-to-date bleacher snapshot from the store, keyed by id
  private latestBleachersByUuid: Map<string, Bleacher>;

  // No external callback; selection is pushed to a zustand store

  constructor(
    app: Application,
    bleachers: Bleacher[],
    events: DashboardEvent[],
    dates: string[],
    yAxis: "Bleachers" | "Events",
    opts?: undefined
  ) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.events = events;
    this.dates = dates;
    this.yAxis = yAxis;
    // Stable mapping for rows
    this.rowBleacherUuids = bleachers.map((b) => b.bleacherUuid);
    this.latestBleachersByUuid = new Map(bleachers.map((b) => [b.bleacherUuid, b] as const));

    // Calculate event spans once during construction depending on yAxis
    if (yAxis === "Bleachers") {
      const sel = useCurrentEventStore.getState();
      const selected =
        sel.eventStart && sel.eventEnd
          ? {
              eventUuid: sel.eventUuid ?? null,
              bleacherUuids: sel.bleacherUuids ?? [],
              eventStart: sel.eventStart,
              eventEnd: sel.eventEnd,
              eventName: sel.eventName || undefined,
              address: sel.addressData?.address || undefined,
              hslHue: sel.hslHue ?? undefined,
              selectedStatus: sel.selectedStatus,
              goodshuffleUrl: sel.goodshuffleUrl ?? null,
            }
          : undefined;
      const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, dates, { selected });
      this.spansByRow = spansByRow;
    } else {
      this.spansByRow = this.calculateSpansByEvents(events, dates);
    }

    // Subscribe to dashboard bleachers store to update block text dynamically
    try {
      let prevData = useDashboardBleachersStore.getState().data;
      this.unsubBleachers = useDashboardBleachersStore.subscribe((s) => {
        const nextData = s.data;
        if (this.yAxis !== "Bleachers") {
          prevData = nextData;
          return;
        }

        // Map current ROW -> bleacherId to row indices (stable, based on initial input)
        const uuidToRow = new Map<string, number>();
        this.rowBleacherUuids.forEach((id, i) => uuidToRow.set(id, i));
        const prevByUuid = new Map(prevData.map((b) => [b.bleacherUuid, b] as const));

        // For each bleacher present in next data, compare block texts by date
        for (const nextBleacher of nextData) {
          const rowIndex = uuidToRow.get(nextBleacher.bleacherUuid);
          if (rowIndex === undefined) continue;
          const prevBleacher = prevByUuid.get(nextBleacher.bleacherUuid);
          const prevBlocksByDate = new Map(
            (prevBleacher?.blocks ?? []).map((bl) => [bl.date, bl.text] as const)
          );
          const nextBlocksByDate = new Map(
            (nextBleacher.blocks ?? []).map((bl) => [bl.date, bl.text] as const)
          );
          const allDates = new Set<string>([
            ...Array.from(prevBlocksByDate.keys()),
            ...Array.from(nextBlocksByDate.keys()),
          ]);

          for (const d of allDates) {
            const prevText = prevBlocksByDate.get(d) ?? "";
            const nextText = nextBlocksByDate.get(d) ?? "";
            if (prevText !== nextText) {
              const colIndex = this.dates.indexOf(d);
              if (colIndex !== -1) {
                const key = `${rowIndex}:${colIndex}`;
                const vis = this.visibleCells.get(key);
                // Update latest snapshot map so rebuild uses current data
                this.latestBleachersByUuid = new Map(
                  nextData.map((b) => [b.bleacherUuid, b] as const)
                );
                if (vis) {
                  // Rebuild just this visible cell to refresh its baked text
                  this.buildCell(
                    rowIndex,
                    colIndex,
                    vis.w,
                    vis.h,
                    vis.parent,
                    vis.firstVisibleColumn
                  );
                }
              }
            }
          }
        }

        // Keep snapshot in sync
        prevData = nextData;
        this.latestBleachersByUuid = new Map(nextData.map((b) => [b.bleacherUuid, b] as const));
      });
    } catch {}
  }

  /**
   * Update underlying data and recompute spans without recreating the renderer
   * Call Grid.forceUpdate() after this to refresh visible cells.
   */
  public setData(bleachers: Bleacher[], events: DashboardEvent[], yAxis: "Bleachers" | "Events") {
    console.log("setData MainScrollableGridCellRenderer");
    this.baker.destroyAll();
    this.bleachers = bleachers;
    this.events = events;
    this.yAxis = yAxis;
    this.rowBleacherUuids = bleachers.map((b) => b.bleacherUuid);
    this.latestBleachersByUuid = new Map(bleachers.map((b) => [b.bleacherUuid, b] as const));

    if (yAxis === "Bleachers") {
      const sel = useCurrentEventStore.getState();
      const selected =
        sel.eventStart && sel.eventEnd
          ? {
              eventUuid: sel.eventUuid ?? null,
              bleacherUuids: sel.bleacherUuids ?? [],
              eventStart: sel.eventStart,
              eventEnd: sel.eventEnd,
              eventName: sel.eventName || undefined,
              address: sel.addressData?.address || undefined,
              hslHue: sel.hslHue ?? undefined,
              selectedStatus: sel.selectedStatus,
              goodshuffleUrl: sel.goodshuffleUrl ?? null,
            }
          : undefined;
      const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, this.dates, { selected });
      this.spansByRow = spansByRow;
    } else {
      this.spansByRow = this.calculateSpansByEvents(events, this.dates);
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
        eventUuid: ev.eventUuid,
        bleacherEventUuid: ev.bleacherEventUuid ?? "-1",
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
    // Track visibility for targeted rebuilds on store updates
    const key = `${row}:${col}`;
    const oldKey = (parent as any).__cellKey as string | undefined;
    if (oldKey && oldKey !== key) {
      this.visibleCells.delete(oldKey);
    }
    (parent as any).__cellKey = key;
    this.visibleCells.set(key, { parent, w: cellWidth, h: cellHeight, firstVisibleColumn });
    parent.zIndex = 0;

    // Check if this cell has an event (bleachers or events mode)
    const eventInfo = EventsUtil.getCellEventInfo(row, col, this.spansByRow);

    // --- Normal event rendering ---
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
        parent.zIndex = 3;

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
        const eventSprite = new EventBody(eventInfo, this.baker, dimensions);
        parent.addChild(eventSprite);
      }
    } else {
      const tile = new Tile(dimensions, this.baker, row, col, this.yAxis === "Bleachers");
      parent.addChild(tile);

      // Attempt to find a block (bleachers mode only) using the latest store snapshot by bleacherUuid
      const bleacherUuid = this.rowBleacherUuids[row];
      const bleacher = this.latestBleachersByUuid.get(bleacherUuid) ?? this.bleachers[row];
      const date = this.dates[col];
      if (this.yAxis === "Bleachers" && bleacher && date) {
        const block = bleacher.blocks.find((b) => b.date === date);
        if (block && block.text) {
          const labelKey = `block:${bleacher.bleacherUuid}:${date}:${block.text}`;
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

    // Render truck icon AFTER event/tile rendering so it appears on top (both event and non-event cells)
    if (this.yAxis === "Bleachers") {
      const bleacherUuid = this.rowBleacherUuids[row];
      const bleacher = this.latestBleachersByUuid.get(bleacherUuid) ?? this.bleachers[row];
      const date = this.dates[col];
      if (bleacher && date) {
        const workTracker = bleacher.workTrackers?.find((wt) => wt.date === date);
        if (workTracker) {
          const icon = new TruckIcon(this.baker, () => {
            // Stop block editor from opening when clicking truck icon
            // Instead open WorkTracker modal via callback if provided
            // Write selection to store to open modal without causing React rerender of dashboard
            useWorkTrackerSelectionStore.getState().setSelected({
              id: workTracker.workTrackerUuid ?? "-1",
              bleacher_uuid: bleacher.bleacherUuid,
              date,
            });
          });
          // Prevent click/tap propagation from icon to tile so CellEditor doesn't open
          icon.eventMode = "static";
          icon.cursor = "pointer";
          icon.on("pointerdown", (e: any) => e.stopPropagation());
          icon.on("pointerup", (e: any) => e.stopPropagation());
          icon.on("pointertap", (e: any) => e.stopPropagation());
          icon.on("click", (e: any) => e.stopPropagation());
          if (workTracker.status) icon.setStatus(workTracker.status);
          const size = Math.min(cellWidth, cellHeight) * 0.55; // bigger for clarity
          icon.scale.set(size / 144); // base baked size 48x48
          icon.position.set(cellWidth - size + 16, 9); // top-right padding
          parent.addChild(icon); // Add to parent, not tile
        }
      }
    }

    return parent;
  }

  private handleLoadBlock(rowIndex: number, columnIndex: number) {
    const store = useSelectedBlockStore.getState();
    const key = `${rowIndex}-${columnIndex}`;
    const bleacherUuid = this.rowBleacherUuids[rowIndex];
    const bleacher = this.latestBleachersByUuid.get(bleacherUuid) ?? this.bleachers[rowIndex];
    const date = this.dates[columnIndex];

    if (!bleacher || !date) return;

    // Find existing block for this date (exact match)
    const existingBlock = bleacher.blocks.find((b) => b.date === date);

    store.setField("isOpen", true);
    store.setField("key", key);
    store.setField("blockUuid", existingBlock?.blockUuid ?? null);
    store.setField("bleacherUuid", bleacher.bleacherUuid);
    store.setField("date", date);
    store.setField("text", existingBlock?.text ?? "");
    // Work tracker integration not yet wired in this data set
    // Attach workTrackerUuid if it exists for this bleacher/date
    const workTracker = bleacher.workTrackers?.find((wt) => wt.date === date);
    store.setField("workTrackerUuid", workTracker?.workTrackerUuid ?? null);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    try {
      this.unsubBleachers?.();
    } catch {}
    this.visibleCells.clear();
    // this.assetManager.destroy();
  }
}
