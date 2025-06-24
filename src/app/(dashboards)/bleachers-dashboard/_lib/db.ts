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
import { DashboardBleacher, DashboardBlock, DashboardEvent } from "./types";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { useMemo } from "react";
import { UserResource } from "@clerk/types";
import { updateDataBase } from "@/app/actions/db.actions";
import { useBlocksStore } from "@/state/blocksStore";
import { EditBlock } from "./_components/dashboard/MainScrollableGrid";
import { SetupTeardownBlock } from "./_components/dashboard/SetupTeardownBlockModal";

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
  const blocks = useBlocksStore((s) => s.blocks);

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

        const relatedBlocks: DashboardBlock[] = blocks
          .filter((block) => block.bleacher_id === bleacher.bleacher_id)
          .map((block) => ({
            blockId: block.block_id,
            bleacherId: bleacher.bleacher_id,
            text: block.text ?? "",
            date: block.date ?? "",
          }));

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
              bleacherEventId: be.bleacher_event_id,
              eventName: event.event_name,
              addressData: address
                ? {
                    addressId: address.address_id,
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
              setupText: be.setup_text,
              setupConfirmed: be.setup_confirmed,
              sameDaySetup: !event.setup_start, // if setup_start is null, assume same-day
              eventStart: event.event_start,
              eventEnd: event.event_end,
              teardownEnd: event.teardown_end ?? "",
              teardownText: be.teardown_text,
              teardownConfirmed: be.teardown_confirmed,
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
          blocks: relatedBlocks,
        };
      })
      .sort((a, b) => b.bleacherNumber - a.bleacherNumber);
    // console.log("formattedBleachers", formattedBleachers);

    return formattedBleachers;
  }, [bleachers, homeBases, addresses, events, bleacherEvents, blocks]);
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
        bleacherEventId: -1, // unused
        eventName: event.event_name,
        addressData: address
          ? {
              addressId: address.address_id,
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
        setupText: null, // unused
        setupConfirmed: false, // unused
        sameDaySetup: !event.setup_start,
        eventStart: event.event_start,
        eventEnd: event.event_end,
        teardownEnd: event.teardown_end ?? "",
        teardownText: null, // unused
        teardownConfirmed: false, // unused
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
    // console.log("dashboardEvents", dashboardEvents);

    // ✅ Sort by setup if exists else eventStart (earliest first)
    dashboardEvents.sort((a, b) => {
      const dateA = new Date(a.setupStart || a.eventStart).getTime();
      const dateB = new Date(b.setupStart || b.eventStart).getTime();
      return dateA - dateB;
    });
    return dashboardEvents;
  }, [events, addresses, bleacherEvents]);
}

export async function saveSetupTeardownBlock(
  block: SetupTeardownBlock | null,
  token: string | null
): Promise<void> {
  if (!token) {
    console.warn("No token found");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No token found"],
        }),
      { duration: 10000 }
    );
    throw new Error("No authentication token found");
  }

  if (!block) {
    console.error("No setup block provided for save");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No setup block provided for save"],
        }),
      { duration: 10000 }
    );
    throw new Error("No setup block selected to save.");
  }

  const supabase = await getSupabaseClient(token);
  if (block.bleacherEventId) {
    const data =
      block.type === "setup"
        ? {
            setup_text: block.text,
            setup_confirmed: block.confirmed,
          }
        : {
            teardown_text: block.text,
            teardown_confirmed: block.confirmed,
          };
    const { error } = await supabase
      .from("BleacherEvents")
      .update(data)
      .eq("bleacher_event_id", block.bleacherEventId);
    if (error) {
      console.error("Failed to update BleacherEvent:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: [`Failed to update ${block.type} block`, error.message],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to update ${block.type} block: ${error.message}`);
    }
  } else {
    console.error(`Failed to update ${block.type} block: No BleacherEventId provided.`);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [`Failed to update ${block.type} block: No BleacherEventId provided.`],
        }),
      { duration: 10000 }
    );
    throw new Error(`Failed to update ${block.type} block: No BleacherEventId provided.`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Setup Block saved"],
      }),
    { duration: 10000 }
  );
  updateDataBase(["BleacherEvents"]);
}

export async function saveBlock(block: EditBlock | null, token: string | null): Promise<void> {
  if (!token) {
    console.warn("No token found");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No token found"],
        }),
      { duration: 10000 }
    );
    throw new Error("No authentication token found");
  }

  if (!block) {
    console.error("No block provided for save");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No block provided for save"],
        }),
      { duration: 10000 }
    );
    throw new Error("No block selected to save.");
  }

  const supabase = await getSupabaseClient(token);
  if (block.blockId) {
    const { error } = await supabase
      .from("Blocks")
      .update({ text: block.text })
      .eq("block_id", block.blockId);
    if (error) {
      console.error("Failed to update block:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to update block", error.message],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to update block: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("Blocks").insert({
      bleacher_id: block.bleacherId,
      date: block.date,
      text: block.text,
    });
    if (error) {
      console.error("Failed to insert block:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to insert block", error.message],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to insert block: ${error.message}`);
    }
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Block saved"],
      }),
    { duration: 10000 }
  );
  updateDataBase(["Blocks"]);
}

export async function deleteBlock(block: EditBlock | null, token: string | null): Promise<void> {
  if (!token) {
    console.warn("No token found");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No token found"],
        }),
      { duration: 10000 }
    );
    throw new Error("No authentication token found");
  }

  if (!block) {
    console.error("No block provided for save");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No block provided for save"],
        }),
      { duration: 10000 }
    );
    throw new Error("No block selected to save.");
  }

  const supabase = await getSupabaseClient(token);
  if (block.blockId) {
    const { error } = await supabase.from("Blocks").delete().eq("block_id", block.blockId);
    if (error) {
      console.error("Failed to delete block:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to delete block", error.message],
          }),
        { duration: 10000 }
      );
      throw new Error(`Failed to delete block: ${error.message}`);
    }
  } else {
    console.error("No Block ID provided for delete.");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to delete block, no block ID provided."],
        }),
      { duration: 10000 }
    );
    throw new Error(`No Block ID provided for delete.`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Block Deleted"],
      }),
    { duration: 10000 }
  );
  updateDataBase(["Blocks"]);
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

  const supabase = await getSupabaseClient(token);

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
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
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

  const supabase = await getSupabaseClient(token);

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
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}
