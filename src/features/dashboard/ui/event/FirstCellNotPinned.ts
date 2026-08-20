import { Application, Container, Graphics, Rectangle } from "pixi.js";
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
    topOffset: number = 0,
    stripeHeight: number = dimensions.height,
    isAccessible: boolean = true,
  ) {
    // Use the reusable HoverableBakedSprite with our content builder
    const spanCols = eventInfo.span ? eventInfo.span.end - eventInfo.span.start + 1 : 1;
    const spanPixelWidth = spanCols * CELL_WIDTH;

    super(
      baker,
      `FirstCellNotPinned:${eventInfo.span?.ev.eventUuid}:top${topOffset}:sh${stripeHeight}:a${eventInfo.span?.ev.alertCount ?? 0}:${isAccessible ? "acc" : "noacc"}`,
      (container) => {
        // Build the event content (unmasked — full event body visible)
        const eventCell = new EventBody(eventInfo, baker, dimensions, topOffset, isAccessible);
        container.addChild(eventCell);

        const spanWidth = eventInfo.span
          ? (eventInfo.span.end - eventInfo.span.start + 1) * CELL_WIDTH - 8
          : undefined;
        const eventCellLabel = new PinnableSection(
          eventInfo.span!,
          app,
          baker,
          spanWidth,
          isAccessible,
        );
        eventCellLabel.position.y = topOffset + 4;

        // Mask only the label to its stripe so it doesn't bleed into shorter overlapping events
        // EventBody stays unmasked so the full body is always visible
        const labelWrapper = new Container();
        labelWrapper.addChild(eventCellLabel);
        const stripeMask = new Graphics()
          .rect(0, 0, spanPixelWidth, topOffset + stripeHeight - 1)
          .fill(0xffffff);
        labelWrapper.addChild(stripeMask);
        labelWrapper.mask = stripeMask;
        container.addChild(labelWrapper);
      },
      // dimensions
    );

    // The baked container spans every day in the event. Restrict its own hover
    // hit area to its start cell so it cannot capture a work tracker rendered in
    // a later cell. Those later cells have their own EventBody click targets.
    this.hitArea = new Rectangle(0, 0, dimensions.width, dimensions.height);
  }

  /**
   * Get the dimensions needed for positioning additional elements
   */
  public getLabelDimensions(): { width: number; height: number } {
    const bounds = this.getBounds();
    return { width: bounds.width, height: bounds.height };
  }
}
