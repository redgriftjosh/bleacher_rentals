import { Application, Container, Text, Graphics } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { BleacherCell } from "../ui/BleacherCell";
import { Tile } from "../ui/Tile";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";
import { EventCellLabel } from "../ui/EventCellLabel";
import { EventSpanType, EventsUtil } from "../util/Events";

export class PinnedYCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private bleachers: Bleacher[];
  private spansByRow: EventSpanType[][];
  private dates: string[];
  private currentScrollX: number = 0;
  private cellWidth: number = 0; // Store the cell width from main grid
  private mainGridFirstVisibleColumn: number = 0; // Track main grid's first visible column

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
   * Update the current scroll position and cell width from the main grid
   * This should be called whenever the main grid scrolls horizontally
   */
  updateScrollPosition(scrollX: number, mainGridCellWidth: number) {
    this.currentScrollX = scrollX;
    this.cellWidth = mainGridCellWidth;
  }

  /**
   * Update the main grid's first visible column for pinning calculations
   */
  public setMainGridFirstVisibleColumn(firstVisibleColumn: number) {
    this.mainGridFirstVisibleColumn = firstVisibleColumn;
  }

  /**
   * Build cell content using BleacherCell component
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(
    row: number,
    col: number,
    cellWidth: number,
    cellHeight: number,
    parent: Container,
    viewportLabelLayer?: Container,
    firstVisibleColumn?: number
  ): Container {
    const cellContainer = new Container();

    // Use the main grid's first visible column for pinning calculations
    const currentFirstVisibleColumn = this.mainGridFirstVisibleColumn;

    // Find the event that should be pinned for this row (if any)
    const pinnedEventSpan = EventsUtil.findPinnedEventSpan(
      row,
      currentFirstVisibleColumn,
      this.spansByRow
    );

    if (pinnedEventSpan) {
      const eventCellLabel = new EventCellLabel(pinnedEventSpan, currentFirstVisibleColumn, 0);
      cellContainer.addChild(eventCellLabel);
    }
    // If no pinned event, return empty container (transparent)

    return cellContainer;
  }

  /**
   * Generate unique cache key for Baker
   * Include scroll position and event data in the cache key
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string {
    // const firstVisibleColumn = Math.floor(this.currentScrollX / (this.cellWidth || 1));
    // const pinnedEventSpan = EventsUtil.findPinnedEventSpan(
    //   row,
    //   firstVisibleColumn,
    //   this.spansByRow
    // );

    // if (pinnedEventSpan) {
    //   const isBooked = !!pinnedEventSpan.ev.booked;
    //   const hue = pinnedEventSpan.ev.hslHue ?? 0;
    //   return `pinned:${pinnedEventSpan.ev.bleacherEventId}:${isBooked}:${hue}:${pinnedEventSpan.ev.eventName}:${cellWidth}x${cellHeight}`;
    // }

    // No pinned event, return empty cache key
    return `pinned:empty:${row}::${cellWidth}x${cellHeight}`;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
  }
}
