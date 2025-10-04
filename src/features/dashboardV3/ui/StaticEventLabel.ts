import { Container, Text } from "pixi.js";
import { EventSpanType } from "../util/Events";

/**
 * Static event label component without any interactive elements
 * This can be safely baked into a RenderTexture for performance
 */
export class StaticEventLabel extends Container {
  constructor(eventInfo: EventSpanType, firstVisibleColIndex: number, currentColIndex: number) {
    super();

    const label = new Text({
      text: `${eventInfo.ev.eventName}`,
      style: {
        fontFamily: "Helvetica",
        fontSize: 14,
        fontWeight: "500",
        align: "left",
      },
    });
    this.addChild(label);
  }

  /**
   * Get the dimensions needed for positioning additional elements
   */
  public getLabelDimensions(): { width: number; height: number } {
    const bounds = this.getBounds();
    return { width: bounds.width, height: bounds.height };
  }
}
