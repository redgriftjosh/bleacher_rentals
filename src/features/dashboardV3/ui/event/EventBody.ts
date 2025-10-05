import { Container, Graphics, Sprite, Text } from "pixi.js";
import { EventSpanType, EventsUtil } from "../../util/Events";
import { CELL_HEIGHT, CELL_WIDTH } from "@/features/dashboard/values/constants";
import { Baker } from "../../util/Baker";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { BleacherEvent } from "@/features/dashboard/db/client/bleachers";
import { useEventsStore } from "@/state/eventsStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useAddressesStore } from "@/state/addressesStore";

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

  private handleClick() {
    if (!this.currentSpan) return;

    const event = this.currentSpan.ev;
    this.handleLoadEvent(event);
  }

  private handleLoadEvent(bleacherEvent: BleacherEvent) {
    const store = useCurrentEventStore.getState();
    const setField = store.setField;

    // Get the full event data from stores
    const events = useEventsStore.getState().events;
    const bleacherEvents = useBleacherEventsStore.getState().bleacherEvents;
    const addresses = useAddressesStore.getState().addresses;

    // Find the BleacherEvent record to get the event_id
    const bleacherEventRecord = bleacherEvents.find(
      (be) => be.bleacher_event_id === bleacherEvent.bleacherEventId
    );

    if (!bleacherEventRecord) {
      console.warn("Could not find bleacher event record");
      return;
    }

    // Find the full event data
    const fullEvent = events.find((e) => e.event_id === bleacherEventRecord.event_id);

    if (!fullEvent) {
      console.warn("Could not find full event data");
      return;
    }

    // Find the address data
    const address = addresses.find((a) => a.address_id === fullEvent.address_id);

    // Get all bleacher IDs for this event
    const eventBleacherIds = bleacherEvents
      .filter((be) => be.event_id === fullEvent.event_id)
      .map((be) => be.bleacher_id);

    // Load all event data into the store, similar to EventRenderer
    setField("eventId", fullEvent.event_id);
    setField("eventName", fullEvent.event_name);
    setField(
      "addressData",
      address
        ? {
            addressId: address.address_id,
            address: address.street,
            city: address.city,
            state: address.state_province,
            postalCode: address.zip_postal ?? undefined,
          }
        : null
    );
    setField("seats", fullEvent.total_seats);
    setField("sevenRow", fullEvent.seven_row);
    setField("tenRow", fullEvent.ten_row);
    setField("fifteenRow", fullEvent.fifteen_row);
    setField("setupStart", fullEvent.setup_start ?? "");
    setField("sameDaySetup", !fullEvent.setup_start);
    setField("eventStart", fullEvent.event_start);
    setField("eventEnd", fullEvent.event_end);
    setField("teardownEnd", fullEvent.teardown_end ?? "");
    setField("sameDayTeardown", !fullEvent.teardown_end);
    setField("lenient", fullEvent.lenient);
    setField("selectedStatus", fullEvent.booked ? "Booked" : "Quoted");
    setField("notes", fullEvent.notes ?? "");
    setField("mustBeClean", fullEvent.must_be_clean);
    setField("bleacherIds", eventBleacherIds);
    setField("isFormExpanded", true); // Open the configuration panel
    setField("hslHue", fullEvent.hsl_hue);
    setField("goodshuffleUrl", fullEvent.goodshuffle_url);
  }
}
