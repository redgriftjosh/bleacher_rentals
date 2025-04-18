import { FormattedBleacher } from "@/app/assets/bleachers/_lib/types";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { SelectBleacher } from "@/types/tables/Bleachers";
import { SelectHomeBase } from "@/types/tables/HomeBases";
import { calculateNumDays, checkEventFormRules } from "./functions";
import { Tables, TablesInsert } from "../../../../../database.types";
import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { CurrentEventStore } from "./useCurrentEventStore";
import { useAddressesStore } from "@/state/addressesStore";
import { useEventsStore } from "@/state/eventsStore";
import { DashboardBleacher, DashboardEvent } from "./types";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { supabaseClient } from "@/utils/supabase/supabaseClient";
import { useMemo } from "react";

// 🔁 1. For each bleacher, find all bleacherEvents with its bleacher_id.
// 🔁 2. From those bleacherEvents, get the event_ids.
// 🔁 3. Match those event_ids to full events from your events store.
// 🔁 4. Enrich each event with its address from the addresses store.
// ✅ 5. Add those events as the events field in each DashboardBleacher.

export function fetchBleachers() {
  const bleachers = useBleachersStore((s) => s.bleachers);
  const homeBases = useHomeBasesStore((s) => s.homeBases);
  const addresses = useAddressesStore((s) => s.addresses);
  const events = useEventsStore((s) => s.events);
  const bleacherEvents = useBleacherEventsStore((s) => s.bleacherEvents);

  return useMemo(() => {
    console.log("fetchBleachers (dashboard)");
    if (!bleachers) return [];

    const formattedBleachers: DashboardBleacher[] = bleachers
      .map((bleacher) => {
        const homeBase = homeBases.find((base) => base.home_base_id === bleacher.home_base_id);
        const winterHomeBase = homeBases.find(
          (base) => base.home_base_id === bleacher.winter_home_base_id
        );

        // ✅ Find all bleacherEvents for this bleacher
        const relatedBleacherEvents = bleacherEvents.filter(
          (be) => be.bleacher_id === bleacher.bleacher_id
        );

        // ✅ Map event_ids to full DashboardEvent objects
        const relatedEvents: DashboardEvent[] = relatedBleacherEvents
          .map((be) => {
            const event = events.find((e) => e.event_id === be.event_id);
            if (!event) return null;

            const address = addresses.find((a) => a.address_id === event.address_id);

            return {
              eventName: event.event_name,
              addressData: address
                ? {
                    address: address.street,
                    city: address.city,
                    state: address.state_province,
                    postalCode: address.zip_postal ?? undefined,
                  }
                : null,
              seats: event.total_seats,
              sevenRow: event.seven_row,
              tenRow: event.ten_row,
              fifteenRow: event.fifteen_row,
              setupStart: event.setup_start ?? "",
              sameDaySetup: !event.setup_start, // if setup_start is null, assume same-day
              eventStart: event.event_start,
              eventEnd: event.event_end,
              teardownEnd: event.teardown_end ?? "",
              sameDayTeardown: !event.teardown_end, // same logic
              lenient: event.lenient,
              token: "", // not needed or included here
              selectedStatus: event.booked ? "Booked" : "Quoted",
              notes: event.notes ?? "",
              numDays: calculateNumDays(event.event_start, event.event_end),
              status: event.booked ? "Booked" : "Quoted",
              hslHue: event.hsl_hue,
            };
          })
          .filter((e) => e !== null) as DashboardEvent[]; // filter out nulls

        return {
          bleacherId: bleacher.bleacher_id,
          bleacherNumber: bleacher.bleacher_number,
          bleacherRows: bleacher.bleacher_rows,
          bleacherSeats: bleacher.bleacher_seats,
          homeBase: {
            homeBaseId: homeBase?.home_base_id ?? 0,
            homeBaseName: homeBase?.home_base_name ?? "",
          },
          winterHomeBase: {
            homeBaseId: winterHomeBase?.home_base_id ?? 0,
            homeBaseName: winterHomeBase?.home_base_name ?? "",
          },
          events: relatedEvents,
        };
      })
      .sort((a, b) => b.bleacherNumber - a.bleacherNumber);

    return formattedBleachers;
  }, [bleachers, homeBases, addresses, events, bleacherEvents]);
}

export async function createEvent(state: CurrentEventStore, token: string | null): Promise<void> {
  if (!token) {
    console.warn("No token found");
    throw new Error("No authentication token found");
  }

  const supabase = supabaseClient(token);

  if (!checkEventFormRules(state)) {
    throw new Error("Event form validation failed");
  }

  // 1. Insert Address
  const newAddress: TablesInsert<"Addresses"> = {
    city: state.addressData?.city ?? "",
    state_province: state.addressData?.state ?? "",
    street: state.addressData?.address ?? "",
    zip_postal: state.addressData?.postalCode ?? "",
  };
  const { data: addressData, error: addressError } = await supabase
    .from("Addresses")
    .insert(newAddress)
    .select("address_id")
    .single();

  if (addressError || !addressData) {
    console.error("Failed to insert address:", addressError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to insert address.", addressError?.message ?? ""],
        }),
      { duration: 10000 }
    );
    throw new Error(`Failed to insert address: ${addressError?.message}`);
  }

  const address_id = addressData.address_id;

  // 2. Insert Event
  const newEvent: TablesInsert<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart,
    event_end: state.eventEnd,
    setup_start: state.sameDaySetup ? null : state.setupStart,
    teardown_end: state.sameDayTeardown ? null : state.teardownEnd,
    lenient: state.lenient,
    total_seats: state.seats,
    seven_row: state.sevenRow,
    ten_row: state.tenRow,
    fifteen_row: state.fifteenRow,
    address_id: address_id,
    booked: state.selectedStatus === "Booked",
    notes: state.notes,
    hsl_hue: state.hslHue,
  };

  const { data: eventData, error: eventError } = await supabase
    .from("Events")
    .insert(newEvent)
    .select("event_id")
    .single();

  if (eventError || !eventData) {
    console.error("Failed to insert event:", eventError);
    toast.error("Failed to insert event. Rolling back...");

    // 3. Rollback Address
    const { error: rollbackError } = await supabase
      .from("Addresses")
      .delete()
      .eq("address_id", address_id);

    if (rollbackError) {
      console.error("Failed to rollback address insert:", rollbackError);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: [
              "Rollback failed. Address entry may still exist.",
              rollbackError?.message ?? "",
            ],
          }),
        { duration: 10000 }
      );
    }
    throw new Error(`Failed to insert event: ${eventError?.message}`);
  }

  const event_id = eventData.event_id;

  // ✅ 4. Insert into BleacherEvents
  const bleacherEventInserts = state.bleacherIds.map((bleacher_id) => ({
    event_id,
    bleacher_id,
  }));

  const { error: bleacherEventError } = await supabase
    .from("BleacherEvents")
    .insert(bleacherEventInserts);

  if (bleacherEventError) {
    console.error("Failed to insert into BleacherEvents:", bleacherEventError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Event created, but failed to link bleachers.", bleacherEventError.message],
        }),
      { duration: 10000 }
    );
    throw new Error(`Failed to link bleachers: ${bleacherEventError.message}`);
  }

  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Event Created"],
      }),
    { duration: 10000 }
  );
}
