"use client";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../../database.types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { Bleacher, EventStatus } from "../../types";
import { useDashboardBleachersStore } from "../../state/useDashboardBleachersStore";

type Row = {
  bleacher_id: number;
  bleacher_number: number;
  bleacher_rows: number;
  bleacher_seats: number;
  linxup_device_id: string | null;
  summer: { home_base_name: string; home_base_id: number } | null;
  winter: { home_base_name: string; home_base_id: number } | null;
  bleacher_events: {
    bleacher_event_id: number;
    event: {
      event_id: number;
      event_name: string;
      event_start: string;
      event_end: string;
      hsl_hue: number | null;
      contract_status: EventStatus;
      address: { street: string } | null;
      goodshuffle_url: string | null;
    };
  }[];
  blocks: {
    block_id: number;
    text: string | null;
    date: string | null;
  }[];
  work_trackers: {
    work_tracker_id: number;
    date: string | null;
  }[];
};

export async function FetchDashboardBleachers(
  token: string | null
): Promise<{ bleachers: Bleacher[] }> {
  if (!token) {
    createErrorToast(["No token found"]);
  }

  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Bleachers")
    .select(
      `
      bleacher_id,
      bleacher_number,
      bleacher_rows,
      bleacher_seats,
      linxup_device_id,
      summer:HomeBases!Bleachers_home_base_id_fkey(home_base_name, home_base_id),
      winter:HomeBases!Bleachers_winter_home_base_id_fkey(home_base_name, home_base_id),
      bleacher_events:BleacherEvents!BleacherEvents_bleacher_id_fkey(
        bleacher_event_id,
        event:Events!BleacherEvents_event_id_fkey(
          event_id,
          event_name,
          event_start,
          event_end,
          hsl_hue,
          contract_status,
          goodshuffle_url,
          address:Addresses!Events_address_id_fkey(
            street
          )
        )
      ),
      blocks:Blocks!block_bleacher_id_fkey(
        block_id,
        text,
        date
      ),
      work_trackers:WorkTrackers!worktrackers_bleacher_id_fkey(
        work_tracker_id,
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
    bleacherId: r.bleacher_id,
    bleacherNumber: r.bleacher_number,
    bleacherRows: r.bleacher_rows,
    bleacherSeats: r.bleacher_seats,
    linxupDeviceId: r.linxup_device_id,
    summerHomeBase: r.summer ? { name: r.summer.home_base_name, id: r.summer.home_base_id } : null,
    winterHomeBase: r.winter ? { name: r.winter.home_base_name, id: r.winter.home_base_id } : null,
    bleacherEvents: r.bleacher_events.map((be) => ({
      eventId: be.event.event_id,
      bleacherEventId: be.bleacher_event_id,
      eventName: be.event.event_name,
      eventStart: be.event.event_start,
      eventEnd: be.event.event_end,
      hslHue: be.event.hsl_hue,
      contract_status: be.event.contract_status,
      goodshuffleUrl: be.event.goodshuffle_url ?? null,
      address: be.event.address?.street ?? "",
    })),
    blocks: r.blocks.map((block) => ({
      blockId: block.block_id,
      text: block.text ?? "",
      date: block.date ?? "",
    })),
    workTrackers: (r.work_trackers ?? []).map((wt) => ({
      workTrackerId: wt.work_tracker_id,
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
