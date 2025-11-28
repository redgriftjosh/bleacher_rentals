import { Container, Graphics, Sprite, Text } from "pixi.js";
import { EventSpanType, EventsUtil } from "../../util/Events";
import { CELL_HEIGHT, CELL_WIDTH } from "@/features/dashboard/values/constants";
import { Baker } from "../../util/Baker";
import { BleacherEvent } from "../../types";
import { loadEventById } from "../../db/client/loadEventById";
import { supabaseClientRegistry } from "../../util/supabaseClientRegistry";

export class EventBody extends Sprite {
  private currentSpan?: EventSpanType;

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

    this.currentSpan = eventInfo.span;
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerdown", this.handleClick.bind(this));

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

        const borderWidth = 1;
        const alignment = 1;
        const L = 0;
        const T = 1;
        const R = CELL_WIDTH;
        const B = CELL_HEIGHT;

        const W = CELL_WIDTH;
        const H = CELL_HEIGHT;

        if (isBooked) {
          // Booked events: solid fill
          fill.rect(L, T, W, H).fill(eventColor);
        } else {
          // Quoted events: white background with selective borders
          fill.rect(L, T, W, H).fill(0xffffff); // White background

          // Draw borders based on position in span
          if (eventInfo.isStart) {
            // Start cell: top, left, and bottom borders
            g.moveTo(L, T)
              .lineTo(R, T)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Top
            g.moveTo(L, T)
              .lineTo(L, B)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Left
            g.moveTo(L, B)
              .lineTo(R, B)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Bottom

            // test.text = "Start";
            // const tileGraphics = new Graphics();

            // Draw tile background (light gray)
          } else if (eventInfo.isEnd) {
            // End cell: top, right, and bottom borders
            const r = R - 1;
            g.moveTo(L, T)
              .lineTo(r, T)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Top
            g.moveTo(r, T)
              .lineTo(r, B)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Right
            g.moveTo(L, B)
              .lineTo(r, B)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Bottom
            // test.text = "End";
          } else {
            // Middle cell: only top and bottom borders
            g.moveTo(L, T)
              .lineTo(R, T)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Top
            g.moveTo(L, B)
              .lineTo(R, B)
              .stroke({ width: borderWidth, color: eventColor, alignment }); // Bottom
            // test.text = "Middle";
          }
        }

        c.addChild(fill, g);
        // console.log(
        //   "EventBody",
        //   isBooked ? "booked" : "quoted",
        //   eventInfo.isStart ? "start" : eventInfo.isEnd ? "end" : "middle"
        // );
      }
    );

    this.texture = texture;
  }

  private handleClick() {
    if (!this.currentSpan) return;
    const event = this.currentSpan.ev;
    this.handleLoadEvent(event);
  }

  private async handleLoadEvent(bleacherEvent: BleacherEvent) {
    const supabase = supabaseClientRegistry.getClient();

    if (!supabase) {
      console.warn("No Supabase client available");
      return;
    }

    await loadEventById(bleacherEvent.eventId, supabase);
  }
}
