import { Application, Container, Sprite, Text } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Tile } from "../ui/Tile";
import { RedTile } from "../ui/RedTile";
import { EventSpanBody } from "../ui/EventSpanBody";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";
import { DemoAsset2 } from "../assets/DemoAsset2";
import { EventCell } from "../ui/EventCell";
import { EventCellLabel } from "../ui/EventCellLabel";
import { EventSpanType, EventsUtil } from "../util/Events";

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
    viewportLabelLayer?: Container,
    firstVisibleColumn?: number
  ): Container {
    const cellContainer = new Container();
    const dimensions = { width: cellWidth, height: cellHeight };

    // Check if this cell has an event
    const eventInfo = EventsUtil.getCellEventInfo(row, col, this.spansByRow);

    if (eventInfo.hasEvent && eventInfo.span) {
      // Cell has an event - render event span body
      // Default zIndex for event cells
      // const eventSpanBody = new EventSpanBody(this.baker);
      const eventCell = new EventCell(eventInfo, cellWidth, cellHeight);
      cellContainer.addChild(eventCell);

      // Use passed firstVisibleColumn or calculate from current scroll position
      const currentFirstVisibleColumn =
        firstVisibleColumn ?? Math.floor(this.currentScrollX / (this.cellWidth || 1));

      // Only show the event label if THIS specific event should NOT be pinned
      // (i.e., this event started at or after the first visible column)
      const thisEventShouldBePinned = EventsUtil.shouldEventBePinned(
        eventInfo.span,
        currentFirstVisibleColumn
      );

      if (!thisEventShouldBePinned && eventInfo.isStart) {
        parent.zIndex = 1000;
        const eventCellLabel = new EventCellLabel(eventInfo.span, currentFirstVisibleColumn, col);
        cellContainer.addChild(eventCellLabel);
      } else {
        parent.zIndex = 0;
      }

      // Determine event color
      // const isBooked = !!eventInfo.span.ev.booked;
      // const eventColor =
      //   eventInfo.span.ev.hslHue != null ? hslToRgbInt(eventInfo.span.ev.hslHue, 60, 60) : 0x808080;

      // // Draw the event body piece for this cell
      // if (isBooked) {
      //   eventSpanBody.draw(
      //     0,
      //     0,
      //     cellWidth,
      //     cellHeight - 1,
      //     eventColor, // filled with event color
      //     eventInfo.isStart, // show left cap only at start
      //     eventInfo.isEnd // show right cap only at end
      //   );
      // } else {
      //   eventSpanBody.draw(
      //     0,
      //     0,
      //     cellWidth,
      //     cellHeight - 1,
      //     0xffffff, // white fill for unbooked
      //     eventInfo.isStart, // show left cap only at start
      //     eventInfo.isEnd, // show right cap only at end
      //     { outlined: true, outlineColor: eventColor, outlineWidth: 1 }
      //   );
      // }

      // cellContainer.addChild(eventSpanBody);

      // // Add event name label that can span across multiple cells
      // const labelColor = isBooked ? 0x000000 : eventColor; // black on booked, event color on quoted

      // Create text to measure its width
      // const tempText = new Text({
      //   text: eventInfo.span.ev.eventName,
      //   style: {
      //     fontFamily: "Helvetica",
      //     fontSize: 14,
      //     fontWeight: "500",
      //     fill: labelColor,
      //     align: "left",
      //   },
      // });

      // const textWidth = tempText.width;
      // const cellsNeeded = Math.ceil((textWidth + 8) / cellWidth); // +8 for padding
      // const currentCellIndex = col - eventInfo.span.start; // 0 for start cell, 1 for second cell, etc.

      // // Only show label on cells that need it (first few cells of the span)
      // if (currentCellIndex < cellsNeeded) {
      //   const eventLabel = new Text({
      //     text: eventInfo.span.ev.eventName,
      //     style: {
      //       fontFamily: "Helvetica",
      //       fontSize: 14,
      //       fontWeight: "500",
      //       fill: labelColor,
      //       align: "left",
      //     },
      //   });

      //   // Position the label - offset it based on which cell this is
      //   const xOffset = -(currentCellIndex * cellWidth) + 4; // Shift left by previous cells
      //   eventLabel.position.set(xOffset, 2);
      //   cellContainer.addChild(eventLabel);
      // }

      // tempText.destroy(); // Clean up temporary text
    } else if (row === 3 && col === 3) {
      // Test red tile for debugging (remove this later)
      parent.zIndex = 0; // Default zIndex
      const redTile = new RedTile(this.app, dimensions);
      const sprite = new Sprite(redTile.texture);
      cellContainer.addChild(sprite);
    } else if (row === 5 && col === 5) {
      const demoAsset2 = new DemoAsset2(this.app, this.baker);
      parent.zIndex = 0; // High zIndex for overflow rendering
      cellContainer.addChild(demoAsset2);
    } else {
      // Default empty cell with tile background
      parent.zIndex = 0; // Reset to default zIndex for normal cells
      const defaultTile = new Tile(this.app, dimensions);
      const coordinates = new Text({
        text: `${row}, ${col}`,
        style: {
          fontFamily: "Helvetica",
          fontSize: 14,
          fontWeight: "500",
          fill: 0x000000,
          align: "left",
        },
      });
      const sprite = new Sprite(defaultTile.texture);
      cellContainer.addChild(sprite, coordinates);
    }

    return cellContainer;
  }

  /**
   * Generate unique cache key for Baker
   * Include all data that affects the cell's appearance
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string {
    // Check if this cell has an event
    const eventInfo = EventsUtil.getCellEventInfo(row, col, this.spansByRow);

    if (eventInfo.hasEvent && eventInfo.span) {
      // Include event details in cache key
      const isBooked = !!eventInfo.span.ev.booked;
      const hue = eventInfo.span.ev.hslHue ?? 0;
      const position = eventInfo.isStart ? "start" : eventInfo.isEnd ? "end" : "middle";

      // Calculate if this cell needs the label
      const tempText = new Text({
        text: eventInfo.span.ev.eventName,
        style: { fontFamily: "Helvetica", fontSize: 14, fontWeight: "500" },
      });
      const textWidth = tempText.width;
      const cellsNeeded = Math.ceil((textWidth + 8) / cellWidth);
      const currentCellIndex = col - eventInfo.span.start;
      const hasLabel = currentCellIndex < cellsNeeded;
      tempText.destroy();

      const eventName = hasLabel ? eventInfo.span.ev.eventName : "";
      const cellPosition = currentCellIndex; // Which cell in the span (0, 1, 2, etc.)

      return `event:${eventInfo.span.ev.bleacherEventId}:${isBooked}:${hue}:${position}:${hasLabel}:${cellPosition}:${eventName}:${cellWidth}x${cellHeight}`;
    } else if (row === 3 && col === 3) {
      // Test red tile
      return `cell:red:${cellWidth}x${cellHeight}`;
    } else if (row === 5 && col === 5) {
      // Asset management demo - include current mode in cache key
      // const currentMode = this.assetManager.getCurrentMode("demo-cell-5-5");
      // return `cell:asset:demo:${currentMode}:${cellWidth}x${cellHeight}`;
      return `cell:asset:demo:${cellWidth}x${cellHeight}`;
    } else {
      // Default empty cell
      return `cell:default:${cellWidth}x${cellHeight}`;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    // this.assetManager.destroy();
  }
}
