import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import {
  calculateEventAlerts,
  calculateNumDays,
  checkEventFormRules,
  isUserPermitted,
} from "./functions";
import { TablesInsert } from "../../../../../database.types";
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
import { UserResource } from "@clerk/types";

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

  const eventAlerts = calculateEventAlerts(events, bleacherEvents);
  // console.log("eventAlerts", eventAlerts);

  return useMemo(() => {
    // console.log("fetchBleachers (dashboard)");
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

            const relatedAlerts = eventAlerts[event.event_id] || [];

            return {
              eventId: event.event_id,
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
              alerts: relatedAlerts,
              mustBeClean: event.must_be_clean,
              bleacherIds: bleacherEvents
                .filter((be) => be.event_id === event.event_id)
                .map((be) => be.bleacher_id), // find all bleachers linked to this event
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
    // console.log("formattedBleachers", formattedBleachers);

    return formattedBleachers;
    // const multipliedBleachers = Array.from({ length: 100 }, (_, i) =>
    //   formattedBleachers.map((b) => ({
    //     ...b,
    //     bleacherId: b.bleacherId * 10 + i, // tweak ID to avoid collisions if needed
    //     bleacherNumber: b.bleacherNumber * 10 + i, // optional: adjust display number
    //     events: b.events.map((e) => ({
    //       ...e,
    //       eventId: e.eventId * 10 + i, // optional: make events unique
    //       eventName: `${e.eventName} (${i + 1})`, // distinguish copies
    //     })),
    //   }))
    // ).flat();

    // return multipliedBleachers;
  }, [bleachers, homeBases, addresses, events, bleacherEvents]);
}

export function fetchDashboardEvents() {
  const events = useEventsStore((s) => s.events);
  const addresses = useAddressesStore((s) => s.addresses);
  const bleacherEvents = useBleacherEventsStore((s) => s.bleacherEvents);
  const eventAlerts = calculateEventAlerts(events, bleacherEvents);

  return useMemo(() => {
    if (!events) return [];

    const dashboardEvents: DashboardEvent[] = events.map((event) => {
      const address = addresses.find((a) => a.address_id === event.address_id);
      const relatedAlerts = eventAlerts[event.event_id] || [];

      return {
        eventId: event.event_id,
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
        sameDaySetup: !event.setup_start,
        eventStart: event.event_start,
        eventEnd: event.event_end,
        teardownEnd: event.teardown_end ?? "",
        sameDayTeardown: !event.teardown_end,
        lenient: event.lenient,
        token: "", // unused
        selectedStatus: event.booked ? "Booked" : "Quoted",
        notes: event.notes ?? "",
        numDays: calculateNumDays(event.event_start, event.event_end),
        status: event.booked ? "Booked" : "Quoted",
        hslHue: event.hsl_hue,
        alerts: relatedAlerts,
        mustBeClean: event.must_be_clean,
        bleacherIds: bleacherEvents
          .filter((be) => be.event_id === event.event_id)
          .map((be) => be.bleacher_id),
      };
    });
    console.log("dashboardEvents", dashboardEvents);

    // ✅ Sort by setup if exists else eventStart (earliest first)
    dashboardEvents.sort((a, b) => {
      const dateA = new Date(a.setupStart || a.eventStart).getTime();
      const dateB = new Date(b.setupStart || b.eventStart).getTime();
      return dateA - dateB;
    });
    return dashboardEvents;
  }, [events, addresses, bleacherEvents]);
}

export async function createEvent(
  state: CurrentEventStore,
  token: string | null,
  user: UserResource | null
): Promise<void> {
  if (!token) {
    console.warn("No token found");
    throw new Error("No authentication token found");
  }

  const supabase = supabaseClient(token);

  if (!checkEventFormRules(state, user)) {
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
    must_be_clean: state.mustBeClean,
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

export async function updateEvent(
  state: CurrentEventStore,
  token: string | null,
  user: UserResource | null
): Promise<void> {
  if (!token) {
    console.warn("No token found");
    throw new Error("No authentication token found");
  }

  if (state.eventId === null) {
    console.error("No eventId provided for update");
    throw new Error("No event selected to update.");
  }

  const supabase = supabaseClient(token);

  if (!checkEventFormRules(state, user)) {
    throw new Error("Event form validation failed");
  }

  // 1. Update Address (if address exists)
  if (state.addressData) {
    const updatedAddress: Partial<TablesInsert<"Addresses">> = {
      city: state.addressData.city ?? "",
      state_province: state.addressData.state ?? "",
      street: state.addressData.address ?? "",
      zip_postal: state.addressData.postalCode ?? "",
    };

    const { error: addressError } = await supabase
      .from("Addresses")
      .update(updatedAddress)
      .eq("address_id", state.eventId); // assuming eventId === address_id, but you might need to store address_id separately if not!

    if (addressError) {
      console.error("Failed to update address:", addressError);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to update address.", addressError?.message ?? ""],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to update address: ${addressError?.message}`);
    }
  }

  // 2. Update Event
  const updatedEvent: Partial<TablesInsert<"Events">> = {
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
    booked: state.selectedStatus === "Booked",
    notes: state.notes,
    hsl_hue: state.hslHue,
    must_be_clean: state.mustBeClean,
  };

  const { error: eventError } = await supabase
    .from("Events")
    .update(updatedEvent)
    .eq("event_id", state.eventId);

  if (eventError) {
    console.error("Failed to update event:", eventError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to update event.", eventError?.message ?? ""],
        }),
      { duration: 10000 }
    );
    throw new Error(`Failed to update event: ${eventError?.message}`);
  }

  // 3. Update BleacherEvents links (optional, depending if bleachers changed)
  if (state.bleacherIds.length > 0) {
    // First, delete existing bleacher links for this event
    const { error: deleteError } = await supabase
      .from("BleacherEvents")
      .delete()
      .eq("event_id", state.eventId);

    if (deleteError) {
      console.error("Failed to delete existing bleacher links:", deleteError);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to clear existing bleachers.", deleteError?.message ?? ""],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to clear old bleacher links: ${deleteError?.message}`);
    }

    // Then, insert new ones
    const bleacherEventInserts = state.bleacherIds.map((bleacher_id) => ({
      event_id: state.eventId,
      bleacher_id,
    }));

    const { error: insertError } = await supabase
      .from("BleacherEvents")
      .insert(bleacherEventInserts);

    if (insertError) {
      console.error("Failed to link new bleachers:", insertError);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Updated event, but failed to link bleachers.", insertError?.message ?? ""],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to link new bleachers: ${insertError?.message}`);
    }
  }

  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Event Updated"],
      }),
    { duration: 10000 }
  );
}

export async function deleteEvent(
  eventId: number | null,
  stateProv: string,
  token: string | null,
  user: UserResource | null
): Promise<void> {
  if (!token) {
    console.warn("No token found");
    throw new Error("No authentication token found");
  }

  if (!eventId) {
    console.error("No eventId provided for deletion");
    throw new Error("No event selected to delete.");
  }

  isUserPermitted(stateProv, user);

  const supabase = supabaseClient(token);

  // 1. Find the event to get address_id
  const { data: eventData, error: fetchEventError } = await supabase
    .from("Events")
    .select("address_id")
    .eq("event_id", eventId)
    .single();

  if (fetchEventError || !eventData) {
    console.error("Failed to fetch event details:", fetchEventError);
    throw new Error(`Failed to fetch event: ${fetchEventError?.message}`);
  }

  const address_id = eventData.address_id;

  // 2. Delete from BleacherEvents
  const { error: bleacherEventError } = await supabase
    .from("BleacherEvents")
    .delete()
    .eq("event_id", eventId);

  if (bleacherEventError) {
    console.error("Failed to delete bleacher-event links:", bleacherEventError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to remove event from bleachers.", bleacherEventError.message],
        }),
      { duration: 10000 }
    );
    throw new Error(`Failed to delete bleacher-event links: ${bleacherEventError.message}`);
  }

  // 3. Delete Event
  const { error: eventDeleteError } = await supabase
    .from("Events")
    .delete()
    .eq("event_id", eventId);

  if (eventDeleteError) {
    console.error("Failed to delete event:", eventDeleteError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to delete event.", eventDeleteError.message],
        }),
      { duration: 10000 }
    );
    throw new Error(`Failed to delete event: ${eventDeleteError.message}`);
  }

  // 4. Delete Address
  if (address_id) {
    const { error: addressDeleteError } = await supabase
      .from("Addresses")
      .delete()
      .eq("address_id", address_id);

    if (addressDeleteError) {
      console.error("Failed to delete address:", addressDeleteError);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to delete address.", addressDeleteError.message],
          }),
        { duration: 10000 }
      );
      // We won't throw here — event and bleacher links are already deleted
    }
  }

  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Event Deleted"],
      }),
    { duration: 10000 }
  );
}
