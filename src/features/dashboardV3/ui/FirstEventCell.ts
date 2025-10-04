import { Application, Container, Sprite, Text } from "pixi.js";
import { EventInfo, EventSpanType } from "../util/Events";
import { EventBody } from "./EventBody";
import { EventCellLabel } from "./EventCellLabel";
import { Baker } from "../util/Baker";

/**
 * Static event label component without any interactive elements
 * This can be safely baked into a RenderTexture for performance
 */
export class FirstEventCell extends Sprite {
  constructor(
    eventInfo: EventInfo,
    firstVisibleColIndex: number,
    currentColIndex: number,
    app: Application,
    baker: Baker,
    dimensions: { width: number; height: number }
  ) {
    super();

    const texture = baker.getTexture(
      `FirstEventCell:${eventInfo.span?.ev.bleacherEventId}`,
      dimensions,
      (c) => {
        const eventCell = new EventBody(eventInfo, baker, dimensions);
        c.addChild(eventCell);

        const eventCellLabel = new EventCellLabel(
          eventInfo.span!,
          firstVisibleColIndex,
          currentColIndex,
          app,
          "dynamic" // Use dynamic mode for baking (includes triangle)
        );
        c.addChild(eventCellLabel);
      }
    );

    this.texture = texture;
  }

  /**
   * Get the dimensions needed for positioning additional elements
   */
  public getLabelDimensions(): { width: number; height: number } {
    const bounds = this.getBounds();
    return { width: bounds.width, height: bounds.height };
  }
}
