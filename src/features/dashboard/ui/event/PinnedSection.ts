import { Application } from "pixi.js";
import { Baker } from "../../util/Baker";
import { EventInfo } from "../../util/Events";
import { HoverableBakedSprite } from "../../util/HoverableBakedSprite";
import { EventBody } from "./EventBody";
import { PinnableSection } from "./PinnableSection";
import { CELL_WIDTH } from "../../values/constants";

export class PinnedSection extends HoverableBakedSprite {
  constructor(
    eventInfo: EventInfo,
    app: Application,
    baker: Baker,
    dimensions: { width: number; height: number },
  ) {
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

        // console.log("FirstEventCell content built");
      },
      // dimensions
    );
  }
}
