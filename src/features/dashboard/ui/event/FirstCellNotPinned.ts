import { Application, Graphics } from "pixi.js";
import { EventInfo } from "../../util/Events";
import { EventBody } from "./EventBody";
import { Baker } from "../../util/Baker";
import { PinnableSection } from "./PinnableSection";
import { HoverableBakedSprite } from "../../util/HoverableBakedSprite";
import { CELL_WIDTH } from "../../values/constants";

/**
 * Event cell using HoverableBakedSprite for performance + interactivity
 * Demonstrates the power of the reusable hoverable baked sprite pattern
 */
export class FirstCellNotPinned extends HoverableBakedSprite {
  constructor(
    eventInfo: EventInfo,
    firstVisibleColIndex: number,
    currentColIndex: number,
    app: Application,
    baker: Baker,
    dimensions: { width: number; height: number },
  ) {
    // Use the reusable HoverableBakedSprite with our content builder
    const spanCols = eventInfo.span ? eventInfo.span.end - eventInfo.span.start + 1 : 1;
    const spanPixelWidth = spanCols * CELL_WIDTH;

    super(
      baker,
      `FirstCellNotPinned:${eventInfo.span?.ev.eventUuid}`,
      (container) => {
        // Build the event content
        const eventCell = new EventBody(eventInfo, baker, dimensions);
        container.addChild(eventCell);

        const spanWidth = eventInfo.span
          ? (eventInfo.span.end - eventInfo.span.start + 1) * CELL_WIDTH - 8
          : undefined;
        const eventCellLabel = new PinnableSection(eventInfo.span!, app, baker, spanWidth);
        container.addChild(eventCellLabel);

        // Mask to clip label text that overflows the span area vertically
        const mask = new Graphics()
          .rect(0, 0, spanPixelWidth, dimensions.height + 1)
          .fill(0xffffff);
        container.addChild(mask);
        container.mask = mask;
      },
      // dimensions
    );
  }

  /**
   * Get the dimensions needed for positioning additional elements
   */
  public getLabelDimensions(): { width: number; height: number } {
    const bounds = this.getBounds();
    return { width: bounds.width, height: bounds.height };
  }
}
