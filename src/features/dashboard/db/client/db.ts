import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { toast } from "sonner";
import React from "react";
import { createErrorToast, ErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast, SuccessToast } from "@/components/toasts/SuccessToast";
import {
  AddressData,
  CurrentEventStore,
} from "../../../eventConfiguration/state/useCurrentEventStore";
import { useAddressesStore } from "@/state/addressesStore";
import { useEventsStore } from "@/state/eventsStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useMemo } from "react";
import { UserResource } from "@clerk/types";
import { updateDataBase } from "@/app/actions/db.actions";
import { useBlocksStore } from "@/state/blocksStore";
import { SupabaseClient } from "@supabase/supabase-js";
import { useWorkTrackersStore } from "@/state/workTrackersStore";
import { Enums } from "../../../../../database.types";
import {
  DashboardBleacher,
  DashboardBlock,
  DashboardEvent,
  EditBlock,
  SetupTeardownBlock,
} from "../../types";
import { Database, Tables, TablesInsert } from "../../../../../database.types";
import { calculateEventAlerts, calculateNumDays, checkEventFormRules } from "../../functions";
import {
  buildTripDeletedNotification,
  buildTripStatusNotification,
  insertDriverNotification,
} from "@/features/workTrackers/db/notifications";

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
  const workTrackers = useWorkTrackersStore((s) => s.workTrackers);

  const eventAlerts = calculateEventAlerts(events, bleacherEvents);
  // console.log("eventAlerts", eventAlerts);

  return useMemo(() => {
    // console.log("fetchBleachers (dashboard)");
    if (!bleachers) return [];

    const formattedBleachers: DashboardBleacher[] = bleachers
      .map((bleacher) => {
        const homeBase = homeBases.find((base) => base.id === bleacher.summer_home_base_uuid);
        const winterHomeBase = homeBases.find((base) => base.id === bleacher.winter_home_base_uuid);

        const relatedWorkTrackers = workTrackers.filter((wt) => wt.bleacher_uuid === bleacher.id);

        const relatedBlocks: DashboardBlock[] = blocks
          .filter((block) => block.bleacher_uuid === bleacher.id)
          .map((block) => ({
            blockUuid: block.id,
            bleacherUuid: bleacher.id,
            text: block.text ?? "",
            date: block.date ?? "",
          }));

        // ✅ Find all bleacherEvents for this bleacher
        const relatedBleacherEvents = bleacherEvents.filter(
          (be) => be.bleacher_uuid === bleacher.id,
        );

        // ✅ Map event_ids to full DashboardEvent objects
        const relatedEvents: DashboardEvent[] = relatedBleacherEvents
          .map((be) => {
            const event = events.find((e) => e.id === be.event_uuid);
            if (!event) return null;

            const address = addresses.find((a) => a.id === event.address_uuid);

            const relatedAlerts = eventAlerts[event.id] || [];

            return {
              eventUuid: event.id,
              bleacherEventUuid: be.id,
              eventName: event.event_name,
              addressData: address
                ? {
                    addressUuid: address.id,
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
              selectedStatus: event.event_status ?? (event.booked ? "booked" : "quoted"),
              notes: event.notes ?? "",
              numDays: calculateNumDays(event.event_start, event.event_end),
              status: event.event_status ?? (event.booked ? "booked" : "quoted"),
              hslHue: event.hsl_hue,
              alerts: relatedAlerts,
              mustBeClean: event.must_be_clean,
              bleacherUuids: bleacherEvents
                .filter((be) => be.event_uuid === event.id)
                .map((be) => be.bleacher_uuid), // find all bleachers linked to this event
              goodshuffleUrl: event.goodshuffle_url ?? null,
              ownerUserUuid: event.created_by_user_uuid ?? null,
            };
          })
          .filter((e) => e !== null) as DashboardEvent[]; // filter out nulls

        return {
          bleacherUuid: bleacher.id,
          bleacherNumber: bleacher.bleacher_number,
          bleacherRows: bleacher.bleacher_rows,
          bleacherSeats: bleacher.bleacher_seats,
          summerHomeBase: {
            homeBaseUuid: homeBase?.id ?? "",
            homeBaseName: homeBase?.home_base_name ?? "",
          },
          winterHomeBase: {
            homeBaseUuid: winterHomeBase?.id ?? "",
            homeBaseName: winterHomeBase?.home_base_name ?? "",
          },
          events: relatedEvents,
          blocks: relatedBlocks,
          relatedWorkTrackers: relatedWorkTrackers.map((wt) => ({
            workTrackerUuid: wt.id,
            date: wt.date ?? "",
          })),
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
      const address = addresses.find((a) => a.id === event.address_uuid);
      const relatedAlerts = eventAlerts[event.id] || [];

      // ✅ Filter out null values from bleacher UUIDs
      const eventBleachers = bleacherEvents.filter((be) => be.event_uuid === event.id);
      const bleacherUuids = eventBleachers
        .map((be) => be.bleacher_uuid)
        .filter((uuid): uuid is string => uuid !== null); // Type guard to remove nulls

      return {
        eventUuid: event.id,
        bleacherEventUuid: "-1", // unused
        eventName: event.event_name,
        addressData: address
          ? {
              addressUuid: address.id,
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
        selectedStatus: event.event_status ?? (event.booked ? "booked" : "quoted"),
        notes: event.notes ?? "",
        numDays: calculateNumDays(event.event_start, event.event_end),
        status: event.event_status ?? (event.booked ? "booked" : "quoted"),
        hslHue: event.hsl_hue,
        alerts: relatedAlerts,
        mustBeClean: event.must_be_clean,
        bleacherUuids: bleacherUuids,
        goodshuffleUrl: event.goodshuffle_url ?? null,
        ownerUserUuid: event.created_by_user_uuid ?? null,
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

async function saveAddress(
  address: AddressData | null,
  addressUuid: string | null,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  if (!address) return null;

  if (addressUuid) {
    const { error: addressError } = await supabase
      .from("Addresses")
      .update({
        city: address.city ?? "",
        state_province: address.state ?? "",
        street: address.address ?? "",
        zip_postal: address.postalCode ?? "",
      })
      .eq("id", addressUuid);

    if (addressError) {
      createErrorToast(["Failed to update address.", addressError?.message ?? ""]);
    }
    return addressUuid;
  } else {
    const { data: addressData, error: addressError } = await supabase
      .from("Addresses")
      .insert({
        city: address.city ?? "",
        state_province: address.state ?? "",
        street: address.address ?? "",
        zip_postal: address.postalCode ?? "",
      })
      .select("id")
      .single();

    if (addressError || !addressData) {
      createErrorToast(["Failed to insert address.", addressError?.message ?? ""]);
    }
    if (!addressData?.id) {
      createErrorToast(["Inserted an address, but no address_id returned."]);
    }
    return addressData?.id;
  }
}

export function getAddressFromUuid(addressUuid: string | null): AddressData | null {
  const addresses = useAddressesStore.getState().addresses;
  if (!addressUuid) return null;
  const address = addresses.find((a) => a.id === addressUuid);
  if (!address) return null;
  return {
    addressUuid: address.id,
    address: address.street,
    city: address.city,
    state: address.state_province,
    postalCode: address.zip_postal ?? undefined,
  };
}

async function fetchDriverUserUuidByDriverUuid(
  driverUuid: string | null,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  if (!driverUuid) return null;

  const { data, error } = await supabase
    .from("Drivers")
    .select("user_uuid")
    .eq("id", driverUuid)
    .single();

  if (error) return null;
  return data?.user_uuid ?? null;
}

function toNotificationAddress(address: AddressData | null, fallback: string): string {
  const formatted = (address?.address ?? "").trim();
  if (formatted.length > 0) return formatted;
  return fallback;
}

function toNotificationCity(address: AddressData | null, fallback?: string): string | undefined {
  const formatted = (address?.city ?? "").trim();
  if (formatted.length > 0) return formatted;

  const fallbackFormatted = (fallback ?? "").trim();
  return fallbackFormatted.length > 0 ? fallbackFormatted : undefined;
}

export async function fetchAddressFromUuid(
  uuid: string,
  supabase: SupabaseClient<Database>,
  isServer?: boolean,
): Promise<Tables<"Addresses"> | null> {
  const { data, error } = await supabase.from("Addresses").select("*").eq("id", uuid).single();

  if (error) {
    if (isServer) {
      throw new Error(["Failed to fetch address.", error.message].join("\n"));
    }
    createErrorToast(["Failed to fetch address.", error.message]);
  }
  // console.log("fetchAddressFromId", data);
  return data;
}

export async function saveWorkTracker(
  workTracker: Tables<"WorkTrackers"> | null,
  pickUpAddress: AddressData | null,
  dropOffAddress: AddressData | null,
  supabase: SupabaseClient<Database>,
  options?: {
    previousStatus?: Enums<"worktracker_status">;
    driverUserUuid?: string | null;
    previousPickupAddress?: string;
    previousPickupCity?: string;
    previousDropoffAddress?: string;
    previousDropoffCity?: string;
  },
): Promise<void> {
  if (!supabase) {
    createErrorToast(["No Supabase Client found"]);
  }
  if (!workTracker) {
    createErrorToast(["Failed to save work tracker. No work tracker provided."]);
  }
  // const payCents = Math.round(payInput * 100);

  let pickUpAddressUuid: string | null = workTracker.pickup_address_uuid;
  let dropOffAddressUuid: string | null = workTracker.dropoff_address_uuid;
  pickUpAddressUuid = await saveAddress(pickUpAddress, pickUpAddressUuid, supabase);
  dropOffAddressUuid = await saveAddress(dropOffAddress, dropOffAddressUuid, supabase);

  const wasInsert = workTracker.id === "-1";
  const previousStatus = options?.previousStatus ?? "draft";
  const nextStatus = workTracker.status;
  const pickupAddressText = toNotificationAddress(
    pickUpAddress,
    options?.previousPickupAddress ?? "an unknown pickup location",
  );
  const pickupCityText = toNotificationCity(pickUpAddress, options?.previousPickupCity);
  const dropoffAddressText = toNotificationAddress(
    dropOffAddress,
    options?.previousDropoffAddress ?? "an unknown dropoff location",
  );
  const dropoffCityText = toNotificationCity(dropOffAddress, options?.previousDropoffCity);

  if (!wasInsert) {
    const { error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .update({
        date: workTracker.date,
        pickup_address_uuid: pickUpAddressUuid,
        pickup_poc: workTracker.pickup_poc,
        pickup_time: workTracker.pickup_time,
        dropoff_address_uuid: dropOffAddressUuid,
        dropoff_poc: workTracker.dropoff_poc,
        dropoff_time: workTracker.dropoff_time,
        notes: workTracker.notes,
        pay_cents: workTracker.pay_cents,
        bleacher_uuid: workTracker.bleacher_uuid,
        internal_notes: workTracker.internal_notes,
        driver_uuid: workTracker.driver_uuid,
        status: workTracker.status,
      })
      .eq("id", workTracker.id);

    if (workTrackerError) {
      createErrorToast(["Failed to update work tracker.", workTrackerError?.message ?? ""]);
    }
  } else {
    const { data: workTrackerData, error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .insert({
        date: workTracker.date,
        pickup_address_uuid: pickUpAddressUuid,
        pickup_poc: workTracker.pickup_poc,
        pickup_time: workTracker.pickup_time,
        dropoff_address_uuid: dropOffAddressUuid,
        dropoff_poc: workTracker.dropoff_poc,
        dropoff_time: workTracker.dropoff_time,
        notes: workTracker.notes,
        pay_cents: workTracker.pay_cents,
        bleacher_uuid: workTracker.bleacher_uuid,
        internal_notes: workTracker.internal_notes,
        driver_uuid: workTracker.driver_uuid,
        status: workTracker.status,
      })
      .select("id")
      .single();

    if (workTrackerError || !workTrackerData) {
      createErrorToast(["Failed to insert work tracker.", workTrackerError?.message ?? ""]);
    }
    if (!workTrackerData?.id) {
      createErrorToast(["Inserted a work tracker, but no work_tracker_id returned."]);
    }
  }

  const notification = buildTripStatusNotification({
    previousStatus: wasInsert ? "draft" : previousStatus,
    nextStatus,
    pickupAddress: pickupAddressText,
    pickupCity: pickupCityText,
    dropoffAddress: dropoffAddressText,
    dropoffCity: dropoffCityText,
    date: workTracker.date,
  });

  if (notification) {
    const driverUserUuid =
      options?.driverUserUuid ??
      (await fetchDriverUserUuidByDriverUuid(workTracker.driver_uuid, supabase));

    if (driverUserUuid) {
      await insertDriverNotification(supabase, driverUserUuid, notification);
    }
  }

  updateDataBase(["WorkTrackers", "Addresses"]);
  createSuccessToast(["Work Tracker saved"]);
}

export async function deleteWorkTracker(
  workTrackerUuid: string | null,
  supabase: SupabaseClient<Database>,
  options?: {
    driverUserUuid?: string | null;
    driverUuid?: string | null;
    pickupAddress?: string;
    pickupCity?: string;
    dropoffAddress?: string;
    dropoffCity?: string;
    date?: string | null;
  },
): Promise<void> {
  if (!supabase) {
    createErrorToast(["No Supabase Client found"]);
  }

  if (!workTrackerUuid || workTrackerUuid === "-1") {
    createErrorToast(["Invalid work tracker ID"]);
    throw new Error("Invalid work tracker ID");
  }

  const driverUserUuid =
    options?.driverUserUuid ??
    (await fetchDriverUserUuidByDriverUuid(options?.driverUuid ?? null, supabase));

  if (driverUserUuid) {
    await insertDriverNotification(
      supabase,
      driverUserUuid,
      buildTripDeletedNotification({
        pickupAddress: options?.pickupAddress ?? "an unknown pickup location",
        pickupCity: options?.pickupCity,
        dropoffAddress: options?.dropoffAddress ?? "an unknown dropoff location",
        dropoffCity: options?.dropoffCity,
        date: options?.date ?? null,
      }),
    );
  }

  const { error } = await supabase.from("WorkTrackers").delete().eq("id", workTrackerUuid);

  if (error) {
    createErrorToast(["Failed to delete work tracker.", error?.message ?? ""]);
    throw error;
  }

  updateDataBase(["WorkTrackers"]);
  createSuccessToast(["Work Tracker deleted"]);
}

export async function saveSetupTeardownBlock(
  block: SetupTeardownBlock | null,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  if (!supabase) {
    console.warn("No Supabase Client found");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No Supabase Client found"],
        }),
      { duration: 10000 },
    );
    throw new Error("No Supabase Client found");
  }

  if (!block) {
    console.error("No setup block provided for save");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No setup block provided for save"],
        }),
      { duration: 10000 },
    );
    throw new Error("No setup block selected to save.");
  }

  if (block.bleacherEventUuid) {
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
      .eq("bleacher_event_uuid", block.bleacherEventUuid);
    if (error) {
      console.error("Failed to update BleacherEvent:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: [`Failed to update ${block.type} block`, error.message],
          }),
        { duration: 10000 },
      );
      throw new Error(`Failed to update ${block.type} block: ${error.message}`);
    }
  } else {
    console.error(`Failed to update ${block.type} block: No BleacherEventUuid provided.`);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [`Failed to update ${block.type} block: No BleacherEventUuid provided.`],
        }),
      { duration: 10000 },
    );
    throw new Error(`Failed to update ${block.type} block: No BleacherEventUuid provided.`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Setup Block saved"],
      }),
    { duration: 10000 },
  );
  updateDataBase(["BleacherEvents"]);
}

export async function saveBlock(
  block: EditBlock | null,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  if (!supabase) {
    console.warn("No Supabase Client found");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No Supabase Client found"],
        }),
      { duration: 10000 },
    );
    throw new Error("No Supabase Client found");
  }

  if (!block) {
    console.error("No block provided for save");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No block provided for save"],
        }),
      { duration: 10000 },
    );
    throw new Error("No block selected to save.");
  }

  if (block.blockUuid) {
    const { error } = await supabase
      .from("Blocks")
      .update({ text: block.text })
      .eq("id", block.blockUuid);
    if (error) {
      console.error("Failed to update block:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to update block", error.message],
          }),
        { duration: 10000 },
      );
      throw new Error(`Failed to update block: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("Blocks").insert({
      bleacher_uuid: block.bleacherUuid,
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
        { duration: 10000 },
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
    { duration: 10000 },
  );
  updateDataBase(["Blocks"]);
}

export async function deleteBlock(
  block: EditBlock | null,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  if (!supabase) {
    console.warn("No Supabase Client found");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No Supabase Client found"],
        }),
      { duration: 10000 },
    );
    throw new Error("No Supabase Client found");
  }

  if (!block) {
    console.error("No block provided for save");
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["No block provided for save"],
        }),
      { duration: 10000 },
    );
    throw new Error("No block selected to save.");
  }

  if (block.blockUuid) {
    const { error } = await supabase.from("Blocks").delete().eq("id", block.blockUuid);
    if (error) {
      console.error("Failed to delete block:", error);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to delete block", error.message],
          }),
        { duration: 10000 },
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
      { duration: 10000 },
    );
    throw new Error(`No Block ID provided for delete.`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Block Deleted"],
      }),
    { duration: 10000 },
  );
  updateDataBase(["Blocks"]);
}

export async function createEvent(
  state: CurrentEventStore,
  supabase: SupabaseClient<Database>,
  user: UserResource | null,
): Promise<void> {
  if (!supabase) {
    console.warn("No Supabase Client found");
    throw new Error("No Supabase Client found");
  }

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
    .select("id")
    .single();

  if (addressError || !addressData) {
    console.error("Failed to insert address:", addressError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to insert address.", addressError?.message ?? ""],
        }),
      { duration: 10000 },
    );
    throw new Error(`Failed to insert address: ${addressError?.message}`);
  }

  const address_uuid = addressData.id;

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
    address_uuid: address_uuid,
    booked: state.selectedStatus === "booked",
    event_status: state.selectedStatus,
    contract_revenue_cents: state.contractRevenueCents,
    notes: state.notes,
    hsl_hue: state.hslHue,
    must_be_clean: state.mustBeClean,
    goodshuffle_url: state.goodshuffleUrl ?? null,
    created_by_user_uuid: state.ownerUserUuid ?? null,
  };

  const { data: eventData, error: eventError } = await supabase
    .from("Events")
    .insert(newEvent)
    .select("id")
    .single();

  if (eventError || !eventData) {
    console.error("Failed to insert event:", eventError);
    toast.error("Failed to insert event. Rolling back...");

    // 3. Rollback Address
    const { error: rollbackError } = await supabase
      .from("Addresses")
      .delete()
      .eq("id", address_uuid);

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
        { duration: 10000 },
      );
    }
    throw new Error(`Failed to insert event: ${eventError?.message}`);
  }

  const event_uuid = eventData.id;

  // ✅ 4. Insert into BleacherEvents
  const bleacherEventInserts = state.bleacherUuids.map((bleacher_uuid) => ({
    event_uuid,
    bleacher_uuid,
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
      { duration: 10000 },
    );
    throw new Error(`Failed to link bleachers: ${bleacherEventError.message}`);
  }

  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Event Created"],
      }),
    { duration: 10000 },
  );
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}

export async function deleteEvent(
  eventUuid: string | null,
  stateProv: string,
  supabase: SupabaseClient<Database>,
  user: UserResource | null,
): Promise<void> {
  if (!supabase) {
    console.warn("No Supabase Client found");
    throw new Error("No Supabase Client found");
  }

  if (!eventUuid) {
    console.error("No eventUuid provided for deletion");
    throw new Error("No event selected to delete.");
  }

  // isUserPermitted(stateProv, user);

  // 1. Find the event to get address_uuid
  const { data: eventData, error: fetchEventError } = await supabase
    .from("Events")
    .select("address_uuid")
    .eq("id", eventUuid)
    .single();

  if (fetchEventError || !eventData) {
    console.error("Failed to fetch event details:", fetchEventError);
    throw new Error(`Failed to fetch event: ${fetchEventError?.message}`);
  }

  const address_uuid = eventData.address_uuid;

  // 2. Delete from BleacherEvents
  const { error: bleacherEventError } = await supabase
    .from("BleacherEvents")
    .delete()
    .eq("event_uuid", eventUuid);
  // NOTE: ownerUserId not persisted yet; requires schema change to store owner.

  if (bleacherEventError) {
    console.error("Failed to delete bleacher-event links:", bleacherEventError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to remove event from bleachers.", bleacherEventError.message],
        }),
      { duration: 10000 },
    );
    throw new Error(`Failed to delete bleacher-event links: ${bleacherEventError.message}`);
  }

  // 3. Delete Event
  const { error: eventDeleteError } = await supabase.from("Events").delete().eq("id", eventUuid);

  if (eventDeleteError) {
    console.error("Failed to delete event:", eventDeleteError);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to delete event.", eventDeleteError.message],
        }),
      { duration: 10000 },
    );
    throw new Error(`Failed to delete event: ${eventDeleteError.message}`);
  }

  // 4. Delete Address
  if (address_uuid) {
    const { error: addressDeleteError } = await supabase
      .from("Addresses")
      .delete()
      .eq("id", address_uuid);

    if (addressDeleteError) {
      console.error("Failed to delete address:", addressDeleteError);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to delete address.", addressDeleteError.message],
          }),
        { duration: 10000 },
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
    { duration: 10000 },
  );
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}
