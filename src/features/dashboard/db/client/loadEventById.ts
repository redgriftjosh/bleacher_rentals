import { SupabaseClient } from "@supabase/supabase-js";
import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";
import { useFilterDashboardStore } from "@/features/dashboardOptions/useFilterDashboardStore";

/**
 * Loads an event by ID from the database and populates the current event store
 * @param eventId - The event ID to load
 * @param supabase - Supabase client instance
 */
export async function loadEventById(eventId: number, supabase: SupabaseClient): Promise<void> {
  if (!supabase) {
    console.warn("No Supabase client available");
    return;
  }

  try {
    // Fetch the full event with address and bleacher relationships in one query
    const { data: eventData, error: eventError } = await supabase
      .from("Events")
      .select(
        `
        *,
        address:Addresses!Events_address_id_fkey(*),
        bleacher_events:BleacherEvents!BleacherEvents_event_id_fkey(bleacher_id)
      `
      )
      .eq("event_id", eventId)
      .single();

    if (eventError || !eventData) {
      console.warn("Could not find event data", eventError);
      return;
    }

    // Extract bleacher IDs from the relationship
    const eventBleacherIds = eventData.bleacher_events?.map((be: any) => be.bleacher_id) ?? [];

    // Load all event data into the store
    const store = useCurrentEventStore.getState();
    const { setField } = store;

    setField("eventId", eventData.event_id);
    setField("eventName", eventData.event_name);
    setField(
      "addressData",
      eventData.address
        ? {
            addressId: eventData.address.address_id,
            address: eventData.address.street,
            city: eventData.address.city,
            state: eventData.address.state_province,
            postalCode: eventData.address.zip_postal ?? undefined,
          }
        : null
    );
    setField("seats", eventData.total_seats);
    setField("sevenRow", eventData.seven_row);
    setField("tenRow", eventData.ten_row);
    setField("fifteenRow", eventData.fifteen_row);
    setField("setupStart", eventData.setup_start ?? "");
    setField("sameDaySetup", !eventData.setup_start);
    setField("eventStart", eventData.event_start);
    setField("eventEnd", eventData.event_end);
    setField("teardownEnd", eventData.teardown_end ?? "");
    setField("sameDayTeardown", !eventData.teardown_end);
    setField("lenient", eventData.lenient);
    setField("selectedStatus", eventData.booked ? "Booked" : "Quoted");
    setField("notes", eventData.notes ?? "");
    setField("mustBeClean", eventData.must_be_clean);
    setField("bleacherIds", eventBleacherIds);
    setField("isFormExpanded", true); // Open the configuration panel
    setField("hslHue", eventData.hsl_hue);
    setField("goodshuffleUrl", eventData.goodshuffle_url);
    setField("ownerUserId", eventData.created_by_user_id ?? null);

    // Ensure the dashboard flips to Bleachers view and highlights selected bleachers
    try {
      const filterStore = useFilterDashboardStore.getState();
      filterStore.setField("yAxis", "Bleachers");
    } catch (error) {
      console.error("Failed to set dashboard axis:", error);
    }
  } catch (error) {
    console.error("Failed to load event:", error);
  }
}
