import { Container, Graphics, Sprite, Text } from "pixi.js";
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

    const isBooked = !!eventInfo.span?.ev.booked;
    const eventColor =
      eventInfo.span && eventInfo.span.ev.hslHue != null
        ? EventsUtil.hslToRgbInt(eventInfo.span.ev.hslHue, 60, 60)
        : 0x808080;

    const texture = baker.getTexture(
      `EventBody:${eventInfo.span?.ev.eventId}:${isBooked ? "booked" : "quoted"}:${
        eventInfo.isStart ? "start" : eventInfo.isEnd ? "end" : "middle"
      }`,
      null,
      (c) => {
        const g = new Graphics();
        const fill = new Graphics();

        // const test = new Text({
        //   text: "",
        //   style: {
        //     fontFamily: "Helvetica",
        //     fontSize: 14,
        //     fontWeight: "500",
        //     fill: 0x000000,
        //     align: "left",
        //   },
        // });

        if (isBooked) {
          // Booked events: solid fill
          fill.rect(0, 0, CELL_WIDTH, CELL_HEIGHT - 1).fill(eventColor);
        } else {
          // Quoted events: white background with selective borders
          fill.rect(0, 0, CELL_WIDTH, CELL_HEIGHT - 1).fill(0xffffff); // White background

          const borderWidth = 2;

          // Draw borders based on position in span
          if (eventInfo.isStart) {
            // Start cell: top, left, and bottom borders
            g.moveTo(0, 0).lineTo(CELL_WIDTH, 0).stroke({ width: borderWidth, color: eventColor }); // Top
            g.moveTo(0, 0)
              .lineTo(0, CELL_HEIGHT - 1)
              .stroke({ width: borderWidth, color: eventColor }); // Left
            g.moveTo(0, CELL_HEIGHT - 1)
              .lineTo(CELL_WIDTH, CELL_HEIGHT - 1)
              .stroke({ width: borderWidth, color: eventColor }); // Bottom

            // test.text = "Start";
            // const tileGraphics = new Graphics();

            // Draw tile background (light gray)
          } else if (eventInfo.isEnd) {
            // End cell: top, right, and bottom borders
            g.moveTo(0, 0).lineTo(CELL_WIDTH, 0).stroke({ width: borderWidth, color: eventColor }); // Top
            g.moveTo(CELL_WIDTH, 0)
              .lineTo(CELL_WIDTH, CELL_HEIGHT - 1)
              .stroke({ width: borderWidth, color: eventColor }); // Right
            g.moveTo(0, CELL_HEIGHT - 1)
              .lineTo(CELL_WIDTH, CELL_HEIGHT - 1)
              .stroke({ width: borderWidth, color: eventColor }); // Bottom
            // test.text = "End";
          } else {
            // Middle cell: only top and bottom borders
            g.moveTo(0, 0).lineTo(CELL_WIDTH, 0).stroke({ width: borderWidth, color: eventColor }); // Top
            g.moveTo(0, CELL_HEIGHT - 1)
              .lineTo(CELL_WIDTH, CELL_HEIGHT - 1)
              .stroke({ width: borderWidth, color: eventColor }); // Bottom
            // test.text = "Middle";
          }
        }

        c.addChild(fill, g);
        console.log(
          "EventBody",
          isBooked ? "booked" : "quoted",
          eventInfo.isStart ? "start" : eventInfo.isEnd ? "end" : "middle"
        );
      }
    );

    this.texture = texture;
  }
}
