import { Application, Container, Sprite, Text } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Tile } from "../ui/Tile";
import { RedTile } from "../ui/RedTile";
import { EventSpanBody } from "../ui/EventSpanBody";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";
import {
  calculateEventSpans,
  getCellEventInfo,
  hslToRgbInt,
  EventSpanType,
} from "../util/eventSpanCalculations";

/**
 * CellRenderer for the main scrollable grid area
 * Renders cells with event spans when events are present
 *
 * This renderer BUILDS cell content by composing UI components from src/features/dashboardV3/ui/
 * The Grid handles automatic baking and caching for performance
 */
export class MainScrollableGridCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private spansByRow: EventSpanType[][];
  private bleachers: Bleacher[];
  private dates: string[];

  constructor(app: Application, bleachers: Bleacher[], dates: string[]) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.dates = dates;

    // Calculate event spans once during construction
    const { spansByRow } = calculateEventSpans(bleachers, dates);
    this.spansByRow = spansByRow;
  }

  /**
   * Build cell content by composing UI components
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(row: number, col: number, cellWidth: number, cellHeight: number): Container {
    const cellContainer = new Container();
    const dimensions = { width: cellWidth, height: cellHeight };

    // Check if this cell has an event
    const eventInfo = getCellEventInfo(row, col, this.spansByRow);

    if (eventInfo.hasEvent && eventInfo.span) {
      // Cell has an event - render event span body
      const eventSpanBody = new EventSpanBody(this.baker);

      // Determine event color
      const isBooked = !!eventInfo.span.ev.booked;
      const eventColor =
        eventInfo.span.ev.hslHue != null ? hslToRgbInt(eventInfo.span.ev.hslHue, 60, 60) : 0x808080;

      // Draw the event body piece for this cell
      if (isBooked) {
        eventSpanBody.draw(
          0,
          0,
          cellWidth,
          cellHeight - 1,
          eventColor, // filled with event color
          eventInfo.isStart, // show left cap only at start
          eventInfo.isEnd // show right cap only at end
        );
      } else {
        eventSpanBody.draw(
          0,
          0,
          cellWidth,
          cellHeight - 1,
          0xffffff, // white fill for unbooked
          eventInfo.isStart, // show left cap only at start
          eventInfo.isEnd, // show right cap only at end
          { outlined: true, outlineColor: eventColor, outlineWidth: 1 }
        );
      }

      cellContainer.addChild(eventSpanBody);

      // Add event name label that can span across multiple cells
      const labelColor = isBooked ? 0x000000 : eventColor; // black on booked, event color on quoted

      // Create text to measure its width
      const tempText = new Text({
        text: eventInfo.span.ev.eventName,
        style: {
          fontFamily: "Helvetica",
          fontSize: 14,
          fontWeight: "500",
          fill: labelColor,
          align: "left",
        },
      });

      const textWidth = tempText.width;
      const cellsNeeded = Math.ceil((textWidth + 8) / cellWidth); // +8 for padding
      const currentCellIndex = col - eventInfo.span.start; // 0 for start cell, 1 for second cell, etc.

      // Only show label on cells that need it (first few cells of the span)
      if (currentCellIndex < cellsNeeded) {
        const eventLabel = new Text({
          text: eventInfo.span.ev.eventName,
          style: {
            fontFamily: "Helvetica",
            fontSize: 14,
            fontWeight: "500",
            fill: labelColor,
            align: "left",
          },
        });

        // Position the label - offset it based on which cell this is
        const xOffset = -(currentCellIndex * cellWidth) + 4; // Shift left by previous cells
        eventLabel.position.set(xOffset, 2);
        cellContainer.addChild(eventLabel);
      }

      tempText.destroy(); // Clean up temporary text
    } else if (row === 3 && col === 3) {
      // Test red tile for debugging (remove this later)
      const redTile = new RedTile(this.app, dimensions);
      const sprite = new Sprite(redTile.texture);
      cellContainer.addChild(sprite);
    } else {
      // Default empty cell with tile background
      const defaultTile = new Tile(this.app, dimensions);
      const sprite = new Sprite(defaultTile.texture);
      cellContainer.addChild(sprite);
    }

    return cellContainer;
  }

  /**
   * Generate unique cache key for Baker
   * Include all data that affects the cell's appearance
   */
  getCacheKey(row: number, col: number, cellWidth: number, cellHeight: number): string {
    // Check if this cell has an event
    const eventInfo = getCellEventInfo(row, col, this.spansByRow);

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
  }
}
