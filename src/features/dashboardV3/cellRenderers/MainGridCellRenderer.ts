import { Application, Container, Text } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";
import { EventBody } from "../ui/event/EventBody";
import { EventSpanType, EventsUtil } from "../util/Events";
import { Tile } from "../ui/Tile";
import { FirstCellNotPinned } from "../ui/event/FirstCellNotPinned";

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
    const cellContainer = new Container();
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
        cellContainer.addChild(firstCell);
      } else {
        // PINNED EVENT OR EVENT BODY: Use separate caching strategy
        // parent.zIndex = 0;

        const eventSprite = this.baker.getSprite(
          `eventId:${eventInfo.span.ev.bleacherEventId}`,
          dimensions,
          (c) => {
            const eventCell = new EventBody(eventInfo, this.baker, dimensions);
            c.addChild(eventCell);
          }
        );
        cellContainer.addChild(eventSprite);
      }
    } else {
      const tile = new Tile(dimensions, this.baker);
      cellContainer.addChild(tile);
    }
    return cellContainer;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    // this.assetManager.destroy();
  }
}
