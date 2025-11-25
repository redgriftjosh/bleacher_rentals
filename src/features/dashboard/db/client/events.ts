"use client";
import { createErrorToast } from "@/components/toasts/ErrorToast";
// import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { DashboardEvent } from "../../types";
import { useDashboardEventsStore } from "../../state/useDashboardEventsStore";
import { SupabaseClient } from "@supabase/supabase-js";

type Row = {
  event_id: number;
  event_name: string;
  event_start: string;
  event_end: string;
  hsl_hue: number | null;
  booked: boolean;
  goodshuffle_url: string | null;
  lenient: boolean;
  notes: string | null;
  total_seats: number | null;
  seven_row: number | null;
  ten_row: number | null;
  fifteen_row: number | null;
  setup_start: string | null;
  teardown_end: string | null;
  must_be_clean: boolean;
  created_by_user_id: number | null;
  address: {
    address_id: number;
    street: string;
    city: string;
    state_province: string;
    zip_postal: string | null;
  } | null;
  bleacher_events: { bleacher_id: number }[];
};

// Fetch Events into DashboardEvent shape (similar to legacy fetchDashboardEvents)
// Includes address, basic fields, and bleacherIds via BleacherEvents. Setup/Teardown-specific text/flags use defaults.
export async function FetchDashboardEvents(
  supabase: SupabaseClient,
  opts?: { onlyMine?: boolean; clerkUserId?: string | null }
): Promise<{ events: DashboardEvent[] }> {
  if (!supabase) {
    createErrorToast(["No Supabase Client found"]);
  }

  const queryString = `
      event_id,
      event_name,
      event_start,
      event_end,
      hsl_hue,
      booked,
      goodshuffle_url,
      lenient,
      notes,
      total_seats,
      seven_row,
      ten_row,
      fifteen_row,
      setup_start,
      teardown_end,
      must_be_clean,
      created_by_user_id,
      address:Addresses!Events_address_id_fkey(
        address_id,
        street,
        city,
        state_province,
        zip_postal
      ),
      bleacher_events:BleacherEvents!BleacherEvents_event_id_fkey(
        bleacher_id
      )
      `;

  let builder = supabase.from("Events").select(queryString);
  if (opts?.onlyMine) {
    const clerkUserId = opts.clerkUserId ?? null;
    if (clerkUserId) {
      const { data: userRow, error: userErr } = await supabase
        .from("Users")
        .select("user_id")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();
      if (!userErr && userRow?.user_id) {
        builder = builder.eq("created_by_user_id", userRow.user_id);
      }
    }
  }
  const { data: finalData, error } = await builder
    .order("event_start", { ascending: true })
    .overrideTypes<Row[], { merge: false }>();
  if (error) {
    createErrorToast(["Failed to fetch Dashboard Events.", error.message]);
  }

  const events: DashboardEvent[] = (finalData ?? []).map((e) => ({
    eventId: e.event_id,
    bleacherEventId: -1,
    eventName: e.event_name,
    addressData: e.address
      ? {
          addressId: e.address.address_id,
          address: e.address.street,
          city: e.address.city,
          state: e.address.state_province,
          postalCode: e.address.zip_postal ?? undefined,
        }
      : null,
    seats: e.total_seats,
    sevenRow: e.seven_row,
    tenRow: e.ten_row,
    fifteenRow: e.fifteen_row,
    setupStart: e.setup_start ?? "",
    setupText: null,
    setupConfirmed: false,
    sameDaySetup: !e.setup_start,
    eventStart: e.event_start,
    eventEnd: e.event_end,
    teardownEnd: e.teardown_end ?? "",
    teardownText: null,
    teardownConfirmed: false,
    sameDayTeardown: !e.teardown_end,
    lenient: e.lenient,
    token: "",
    selectedStatus: e.booked ? "Booked" : "Quoted",
    notes: e.notes ?? "",
    numDays: 0, // optional; compute in UI if needed
    status: e.booked ? "Booked" : "Quoted",
    hslHue: e.hsl_hue,
    alerts: [],
    mustBeClean: e.must_be_clean,
    bleacherIds: (e.bleacher_events ?? []).map((be) => be.bleacher_id),
    goodshuffleUrl: e.goodshuffle_url ?? null,
    ownerUserId: e.created_by_user_id ?? null,
  }));
  console.log("FetchDashboardEvents events", events);

  // Push into zustand store so Pixi can subscribe live
  try {
    useDashboardEventsStore.getState().setData(events);
    useDashboardEventsStore.getState().setStale(false);
  } catch {}

  return { events };
}
