import { Application, Container, Text } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";
import { EventBody } from "../ui/event/EventBody";
import { EventSpanType, EventsUtil } from "../util/Events";
import { Tile } from "../ui/Tile";
import { FirstCellNotPinned } from "../ui/event/FirstCellNotPinned";
import { CellEditor } from "../util/CellEditor";
import { useSelectedBlockStore } from "@/features/dashboard/state/useSelectedBlock";

/**
 * CellRenderer for the main scrollable grid area
 * Renders cells with event spans when events are present
 *
 * This renderer BUILDS cell content by composing UI components from src/features/dashboardV3/ui/
 * The Grid handles automatic baking and caching for performance
 */
export class MainGridCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private spansByRow: EventSpanType[][];
  private bleachers: Bleacher[];
  private dates: string[];
  private currentScrollX: number = 0;
  private cellWidth: number = 0; // Store the cell width from main grid
  private cellEditor?: CellEditor; // Cell editor instance

  constructor(app: Application, bleachers: Bleacher[], dates: string[]) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.dates = dates;

    // Calculate event spans once during construction
    const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, dates);
    this.spansByRow = spansByRow;
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

    // Check if this cell has an event
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
      const tile = new Tile(dimensions, this.baker, row, col, true);
      parent.addChild(tile);

      // Attempt to find a block for this bleacher + date
      const bleacher = this.bleachers[row];
      const date = this.dates[col];
      if (bleacher && date) {
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
      }

      // Set up click listener for cell editing (after adding children)
      tile.on("cell:edit-request", (data: { row: number; col: number }) => {
        this.handleLoadBlock(data.row, data.col);
        console.log("handleLoadBlock clicked", data);
      });
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
    store.setField("workTrackerId", null);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    // this.assetManager.destroy();
  }
}
