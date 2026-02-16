import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { useCurrentEventStore } from "../state/useCurrentEventStore";

type EventWithAddress = {
  id: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  setup_start: string | null;
  teardown_end: string | null;
  total_seats: number | null;
  seven_row: number | null;
  ten_row: number | null;
  fifteen_row: number | null;
  lenient: number | null;
  event_status: string | null;
  booked: number | null;
  contract_revenue_cents: number | null;
  notes: string | null;
  must_be_clean: number | null;
  hsl_hue: number | null;
  goodshuffle_url: string | null;
  created_by_user_uuid: string | null;
  address_id: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal: string | null;
};

type BleacherEventRow = {
  bleacher_uuid: string | null;
};

/**
 * Loads an event by ID using PowerSync and opens it in the modal
 * @param eventId - The event UUID to load
 */
export async function loadEventForModal(eventId: string): Promise<void> {
  try {
    // Fetch the event with address join using PowerSync/Kysely
    const eventQuery = db
      .selectFrom("Events as e")
      .leftJoin("Addresses as a", "e.address_uuid", "a.id")
      .select([
        "e.id as id",
        "e.event_name",
        "e.event_start",
        "e.event_end",
        "e.setup_start",
        "e.teardown_end",
        "e.total_seats",
        "e.seven_row",
        "e.ten_row",
        "e.fifteen_row",
        "e.lenient",
        "e.event_status",
        "e.booked",
        "e.contract_revenue_cents",
        "e.notes",
        "e.must_be_clean",
        "e.hsl_hue",
        "e.goodshuffle_url",
        "e.created_by_user_uuid",
        "a.id as address_id",
        "a.street as address_street",
        "a.city as address_city",
        "a.state_province as address_state",
        "a.zip_postal as address_postal",
      ])
      .where("e.id", "=", eventId)
      .compile();

    const eventResults = await typedGetAll(eventQuery, expect<EventWithAddress>());
    const eventData = eventResults[0];

    if (!eventData) {
      console.warn("Could not find event data for ID:", eventId);
      return;
    }

    // Fetch bleacher associations separately
    const bleacherQuery = db
      .selectFrom("BleacherEvents")
      .select(["bleacher_uuid"])
      .where("event_uuid", "=", eventId)
      .compile();

    const bleacherEvents = await typedGetAll(bleacherQuery, expect<BleacherEventRow>());

    const bleacherUuids = bleacherEvents.map((be) => be.bleacher_uuid).filter(Boolean) as string[];

    // Load all event data into the store and open modal
    const store = useCurrentEventStore.getState();
    const { setField } = store;

    // First reset to clear any previous data
    store.resetForm();

    // Then populate with the loaded event data
    setField("eventUuid", eventData.id);
    setField("eventName", eventData.event_name ?? "");
    setField(
      "addressData",
      eventData.address_id
        ? {
            addressUuid: eventData.address_id,
            address: eventData.address_street ?? "",
            city: eventData.address_city ?? undefined,
            state: eventData.address_state ?? undefined,
            postalCode: eventData.address_postal ?? undefined,
          }
        : null,
    );
    setField("seats", eventData.total_seats);
    setField("sevenRow", eventData.seven_row);
    setField("tenRow", eventData.ten_row);
    setField("fifteenRow", eventData.fifteen_row);
    setField("setupStart", eventData.setup_start ?? "");
    setField("sameDaySetup", !eventData.setup_start);
    setField("eventStart", eventData.event_start ?? "");
    setField("eventEnd", eventData.event_end ?? "");
    setField("teardownEnd", eventData.teardown_end ?? "");
    setField("sameDayTeardown", !eventData.teardown_end);
    setField("lenient", !!eventData.lenient);
    setField(
      "selectedStatus",
      (eventData.event_status as "quoted" | "booked" | "lost") ??
        (eventData.booked ? "booked" : "quoted"),
    );
    setField("contractRevenueCents", eventData.contract_revenue_cents ?? null);
    setField("notes", eventData.notes ?? "");
    setField("mustBeClean", !!eventData.must_be_clean);
    setField("bleacherUuids", bleacherUuids);
    setField("hslHue", eventData.hsl_hue);
    setField("goodshuffleUrl", eventData.goodshuffle_url ?? null);
    setField("ownerUserUuid", eventData.created_by_user_uuid ?? null);

    // Open the modal (not the dashboard form)
    setField("isModalOpen", true);
    setField("isFormExpanded", false);
    setField("isFormMinimized", false);
  } catch (error) {
    console.error("Failed to load event for modal:", error);
  }
}
