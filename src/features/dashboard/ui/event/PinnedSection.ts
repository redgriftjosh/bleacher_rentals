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
    isAccessible: boolean = true,
  ) {
    super(
      baker,
      `PinnedSection:${eventInfo.span?.ev.eventUuid}:a${eventInfo.span?.ev.alertCount ?? 0}:${isAccessible ? "acc" : "noacc"}`,
      (container) => {
        const eventCell = new EventBody(eventInfo, baker, dimensions, undefined, isAccessible);
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
        container.addChild(eventCellLabel);

        // console.log("FirstEventCell content built");
      },
      // dimensions
    );
  }
}
