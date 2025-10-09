import { Container, Graphics, Sprite, Text } from "pixi.js";
import { EventSpanType, EventsUtil } from "../../util/Events";
import { CELL_HEIGHT, CELL_WIDTH } from "@/features/dashboard/values/constants";
import { Baker } from "../../util/Baker";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { BleacherEvent } from "@/features/dashboard/db/client/bleachers";
import { useEventsStore } from "@/state/eventsStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useAddressesStore } from "@/state/addressesStore";
import { useFilterDashboardStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useFilterDashboardStore";

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
    console.log("EventBody clicked: ", event);
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

    // Find the full event data using either bleacher_event link or direct eventId fallback
    const fullEvent = bleacherEventRecord
      ? events.find((e) => e.event_id === bleacherEventRecord.event_id)
      : events.find((e) => e.event_id === (bleacherEvent as any).eventId);

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
    // Only set owner if backend provides a created_by_user_id
    if ((fullEvent as any).created_by_user_id !== undefined) {
      setField("ownerUserId", (fullEvent as any).created_by_user_id ?? null);
    } else {
      setField("ownerUserId", null);
    }

    // Ensure the dashboard flips to Bleachers view and highlights selected bleachers
    try {
      const filterStore = useFilterDashboardStore.getState();
      filterStore.setField("yAxis", "Bleachers");
    } catch {}
  }
}
