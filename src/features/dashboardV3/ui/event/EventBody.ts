import { Container, Graphics, Sprite } from "pixi.js";
import { EventSpanType, EventsUtil } from "../../util/Events";
import { CELL_HEIGHT, CELL_WIDTH } from "@/features/dashboard/values/constants";
import { Baker } from "../../util/Baker";

export class EventBody extends Sprite {
  constructor(
    eventInfo: {
      hasEvent: boolean;
      span?: EventSpanType;
      isStart: boolean;
      isEnd: boolean;
      isMiddle: boolean;
    },
    baker: Baker,
    dimensions: { width: number; height: number }
  ) {
    super();
    const texture = baker.getTexture(`EventBody:${eventInfo.span?.ev.eventId}`, null, (c) => {
      const eventColor =
        eventInfo.span && eventInfo.span.ev.hslHue != null
          ? EventsUtil.hslToRgbInt(eventInfo.span.ev.hslHue, 60, 60)
          : 0x808080;

      const g = new Graphics();
      g.rect(0, 0, CELL_WIDTH, CELL_HEIGHT - 1).fill(eventColor); // Use actual cell dimensions and apply color
      c.addChild(g);
      console.log("EventBody");
    });
    this.texture = texture;
  }
}
