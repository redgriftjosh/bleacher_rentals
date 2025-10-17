import { Application } from "pixi.js";
import { EventInfo } from "../../util/Events";
import { EventBody } from "./EventBody";
import { Baker } from "../../util/Baker";
import { PinnableSection } from "./PinnableSection";
import { HoverableBakedSprite } from "../../util/HoverableBakedSprite";

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
    dimensions: { width: number; height: number }
  ) {
    // Use the reusable HoverableBakedSprite with our content builder
    super(
      baker,
      `FirstCellNotPinned:${eventInfo.span?.ev.eventId}`,
      (container) => {
        // Build the event content
        const eventCell = new EventBody(eventInfo, baker, dimensions);
        container.addChild(eventCell);

        const eventCellLabel = new PinnableSection(eventInfo.span!, app, baker);
        container.addChild(eventCellLabel);

        // console.log("FirstEventCell content built");
      }
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
