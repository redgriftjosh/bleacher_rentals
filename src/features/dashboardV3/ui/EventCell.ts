import { Container, Graphics } from "pixi.js";
import { EventSpanType, EventsUtil } from "../util/Events";

export class EventCell extends Container {
  constructor(
    eventInfo: {
      hasEvent: boolean;
      span?: EventSpanType;
      isStart: boolean;
      isEnd: boolean;
      isMiddle: boolean;
    },
    cellWidth: number,
    cellHeight: number
  ) {
    super();
    const eventColor =
      eventInfo.span && eventInfo.span.ev.hslHue != null
        ? EventsUtil.hslToRgbInt(eventInfo.span.ev.hslHue, 60, 60)
        : 0x808080;

    const g = new Graphics();
    g.rect(0, 0, cellWidth, cellHeight - 1).fill(eventColor); // Use actual cell dimensions and apply color
    this.addChild(g);
  }
}
