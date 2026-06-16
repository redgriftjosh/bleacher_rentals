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
import { calculateNumDays, checkEventFormRules } from "../../functions";
import { useDashboardEventsStore } from "../../state/useDashboardEventsStore";
import {
  buildTripDeletedNotification,
  buildTripStatusNotification,
  insertDriverNotification,
} from "@/features/workTrackers/db/notifications";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute, typedGetAll, expect } from "@/lib/powersync/typedQuery";

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
              selectedStatus: event.event_status,
              notes: event.notes ?? "",
              numDays: calculateNumDays(event.event_start, event.event_end),
              status: event.event_status,
              hslHue: event.hsl_hue,
              alerts: [],
              mustBeClean: event.must_be_clean,
              bleacherUuids: bleacherEvents
                .filter((be) => be.event_uuid === event.id)
                .map((be) => be.bleacher_uuid),
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
  return useMemo(() => {
    if (!events) return [];

    const activeEvents = events.filter((e) => !e.deleted);

    const dashboardEvents: DashboardEvent[] = activeEvents.map((event) => {
      const address = addresses.find((a) => a.id === event.address_uuid);

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
        selectedStatus: (event.event_status ?? "quoted") as Enums<"event_status">,
        notes: event.notes ?? "",
        numDays: calculateNumDays(event.event_start, event.event_end),
        status: (event.event_status ?? "quoted") as Enums<"event_status">,
        hslHue: event.hsl_hue,
        alerts: [],
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
): Promise<string | null> {
  if (!address) return null;

  if (addressUuid) {
    await typedExecute(
      db
        .updateTable("Addresses")
        .set({
          city: address.city ?? "",
          state_province: address.state ?? "",
          street: address.address ?? "",
          zip_postal: address.postalCode ?? "",
        })
        .where("id", "=", addressUuid)
        .compile(),
    );
    return addressUuid;
  } else {
    const id = crypto.randomUUID();
    await typedExecute(
      db
        .insertInto("Addresses")
        .values({
          id,
          city: address.city ?? "",
          state_province: address.state ?? "",
          street: address.address ?? "",
          zip_postal: address.postalCode ?? "",
        })
        .compile(),
    );
    return id;
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
  pickUpAddressUuid = await saveAddress(pickUpAddress, pickUpAddressUuid);
  dropOffAddressUuid = await saveAddress(dropOffAddress, dropOffAddressUuid);

  const wasInsert = workTracker.id === "-1";
  let savedWorkTrackerUuid = workTracker.id;
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

  const wtFields = {
    date: workTracker.date,
    pickup_address_uuid: pickUpAddressUuid,
    pickup_poc: workTracker.pickup_poc,
    pickup_time: workTracker.pickup_time,
    pickup_instructions: workTracker.pickup_instructions,
    teardown_required: workTracker.teardown_required ? 1 : 0,
    dropoff_address_uuid: dropOffAddressUuid,
    dropoff_poc: workTracker.dropoff_poc,
    dropoff_time: workTracker.dropoff_time,
    dropoff_instructions: workTracker.dropoff_instructions,
    setup_required: workTracker.setup_required ? 1 : 0,
    notes: workTracker.notes,
    pay_cents: workTracker.pay_cents,
    bleacher_uuid: workTracker.bleacher_uuid,
    internal_notes: workTracker.internal_notes,
    driver_uuid: workTracker.driver_uuid,
    status: workTracker.status,
    work_tracker_type_uuid: workTracker.work_tracker_type_uuid,
    distance_meters: workTracker.distance_meters,
    drive_minutes: workTracker.drive_minutes,
    project_number: workTracker.project_number,
  };

  if (!wasInsert) {
    await typedExecute(
      db
        .updateTable("WorkTrackers")
        .set(wtFields)
        .where("id", "=", workTracker.id)
        .compile(),
    );
  } else {
    savedWorkTrackerUuid = crypto.randomUUID();
    await typedExecute(
      db
        .insertInto("WorkTrackers")
        .values({ id: savedWorkTrackerUuid, ...wtFields })
        .compile(),
    );
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

  try {
    const { triage } = await import("@/features/alerts/triage");
    await triage("WorkTrackers", { id: savedWorkTrackerUuid }, supabase);
  } catch (e) {
    console.error("[alerts] failed to triage after work tracker save", e);
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

  const selectQuery = db
    .selectFrom("WorkTrackers")
    .select("bleacher_uuid")
    .where("id", "=", workTrackerUuid)
    .compile();
  const wtRows = await typedGetAll(selectQuery, expect<{ bleacher_uuid: string | null }>());
  const bleacherUuid = wtRows[0]?.bleacher_uuid ?? null;

  const deleteQuery = db
    .deleteFrom("WorkTrackers")
    .where("id", "=", workTrackerUuid)
    .compile();
  await typedExecute(deleteQuery);

  try {
    const { triage } = await import("@/features/alerts/triage");
    await triage("WorkTrackers_deleted", { id: workTrackerUuid, bleacher_uuid: bleacherUuid }, supabase);
  } catch (e) {
    console.error("[alerts] failed to triage after work tracker delete", e);
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
): Promise<string> {
  if (!supabase) {
    console.warn("No Supabase Client found");
    throw new Error("No Supabase Client found");
  }

  if (!checkEventFormRules(state, user)) {
    throw new Error("Event form validation failed");
  }

  // 1. Insert Address
  const address_uuid = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("Addresses")
      .values({
        id: address_uuid,
        city: state.addressData?.city ?? "",
        state_province: state.addressData?.state ?? "",
        street: state.addressData?.address ?? "",
        zip_postal: state.addressData?.postalCode ?? "",
      })
      .compile(),
  );

  // 2. Insert Event
  const event_uuid = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("Events")
      .values({
        id: event_uuid,
        event_name: state.eventName,
        event_start: state.eventStart,
        event_end: state.eventEnd,
        setup_start: state.sameDaySetup ? null : state.setupStart,
        teardown_end: state.sameDayTeardown ? null : state.teardownEnd,
        lenient: state.lenient ? 1 : 0,
        total_seats: state.seats,
        seven_row: state.sevenRow,
        ten_row: state.tenRow,
        fifteen_row: state.fifteenRow,
        address_uuid,
        event_status: state.selectedStatus,
        contract_revenue_cents: state.contractRevenueCents,
        notes: state.notes,
        hsl_hue: state.hslHue,
        must_be_clean: state.mustBeClean ? 1 : 0,
        goodshuffle_url: state.goodshuffleUrl ?? null,
        created_by_user_uuid: state.ownerUserUuid ?? null,
        booked_at: state.bookedAt ? new Date(state.bookedAt).toISOString() : null,
        ...(state.createdAt ? { created_at: new Date(state.createdAt).toISOString() } : {}),
      })
      .compile(),
  );

  // 3. Insert BleacherEvents
  for (const bleacher_uuid of state.bleacherUuids) {
    await typedExecute(
      db
        .insertInto("BleacherEvents")
        .values({
          id: crypto.randomUUID(),
          event_uuid,
          bleacher_uuid,
        })
        .compile(),
    );
  }

  createSuccessToast(["Event Created"]);
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
  return event_uuid;
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

  // Soft delete — mark as deleted instead of removing rows
  await typedExecute(
    db
      .updateTable("Events")
      .set({ deleted: 1 })
      .where("id", "=", eventUuid)
      .compile(),
  );

  // Immediately update local stores so non-PowerSync consumers reflect the change
  const currentEvents = useEventsStore.getState().events;
  useEventsStore.getState().setEvents(
    currentEvents.map((e) => (e.id === eventUuid ? { ...e, deleted: true } : e)),
  );

  createSuccessToast(["Event Deleted"]);
  updateDataBase(["Events"]);
}
