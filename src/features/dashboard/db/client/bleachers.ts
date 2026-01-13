"use client";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Database, Tables } from "../../../../../database.types";
// import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { Bleacher } from "../../types";
import { useDashboardBleachersStore } from "../../state/useDashboardBleachersStore";
import { SupabaseClient } from "@supabase/supabase-js";

type Row = {
  id: string; // Bleachers.id (uuid)
  bleacher_number: number;
  bleacher_rows: number;
  bleacher_seats: number;
  linxup_device_id: string | null;

  summer: { home_base_name: string; id: string } | null; // HomeBases.id (uuid)
  winter: { home_base_name: string; id: string } | null;

  bleacher_events: {
    id: string; // BleacherEvents.id (uuid)
    event: {
      id: string; // Events.id (uuid)
      event_name: string;
      event_start: string;
      event_end: string;
      hsl_hue: number | null;
      booked: boolean;
      goodshuffle_url: string | null;
      address: { street: string } | null;
    } | null;
  }[];

  blocks: {
    id: string; // Blocks.id (uuid)
    text: string | null;
    date: string | null;
  }[];

  work_trackers: {
    id: string; // WorkTrackers.id (uuid)
    date: string | null;
  }[];
};

export async function FetchDashboardBleachers(
  supabase: SupabaseClient<Database>
): Promise<{ bleachers: Bleacher[] }> {
  if (!supabase) {
    createErrorToast(["No Supabase Client found"]);
  }
  const { data, error } = await supabase
    .from("Bleachers")
    .select(
      `
      id,
    bleacher_number,
    bleacher_rows,
    bleacher_seats,
    linxup_device_id,

    summer:HomeBases!bleachers_summer_home_base_uuid_fkey(
      home_base_name,
      id
    ),
    winter:HomeBases!bleachers_winter_home_base_uuid_fkey(
      home_base_name,
      id
    ),

    bleacher_events:BleacherEvents!BleacherEvents_bleacher_uuid_fkey(
      id,
      event:Events!BleacherEvents_event_uuid_fkey(
        id,
        event_name,
        event_start,
        event_end,
        hsl_hue,
        booked,
        goodshuffle_url,
        address:Addresses!Events_address_uuid_fkey(
          street
        )
      )
    ),

    blocks:Blocks!Blocks_bleacher_uuid_fkey(
      id,
      text,
      date
    ),

    work_trackers:WorkTrackers!WorkTrackers_bleacher_uuid_fkey(
      id,
      date
    )
      `
    )
    .order("bleacher_number", { ascending: true })
    .overrideTypes<Row[], { merge: false }>();

  if (error) {
    createErrorToast(["Failed to fetch Dashboard Bleachers.", error.message]);
  }
  // console.log("data", data);
  const bleachers: Bleacher[] = (data ?? []).map((r) => ({
    bleacherUuid: r.id,
    bleacherNumber: r.bleacher_number,
    bleacherRows: r.bleacher_rows,
    bleacherSeats: r.bleacher_seats,
    linxupDeviceId: r.linxup_device_id,

    summerHomeBase: r.summer ? { name: r.summer.home_base_name, homeBaseUuid: r.summer.id } : null,

    winterHomeBase: r.winter ? { name: r.winter.home_base_name, homeBaseUuid: r.winter.id } : null,

    bleacherEvents: (r.bleacher_events ?? [])
      // optional: if you *only* want rows that actually have an event
      .filter((be) => !!be.event)
      .map((be) => ({
        eventUuid: be.event!.id,
        bleacherEventUuid: be.id,
        eventName: be.event!.event_name,
        eventStart: be.event!.event_start,
        eventEnd: be.event!.event_end,
        hslHue: be.event!.hsl_hue,
        booked: be.event!.booked,
        goodshuffleUrl: be.event!.goodshuffle_url ?? null,
        address: be.event!.address?.street ?? "",
      })),

    blocks: (r.blocks ?? []).map((block) => ({
      blockUuid: block.id,
      text: block.text ?? "",
      date: block.date ?? "",
    })),

    workTrackers: (r.work_trackers ?? []).map((wt) => ({
      workTrackerUuid: wt.id,
      date: wt.date ?? "",
    })),
  }));

  // console.log("bleachers", bleachers);
  // Update the dashboard bleachers store so other parts of the app can react
  try {
    useDashboardBleachersStore.getState().setData(bleachers);
    useDashboardBleachersStore.getState().setStale(false);
  } catch {}

  return { bleachers };
}
