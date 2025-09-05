"use client";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../../database.types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export type Bleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  summerHomeBase: string;
  winterHomeBase: string;
  bleacherEvents: BleacherEvent[];
};

export type BleacherEvent = {
  eventName: string;
  eventStart: string;
  eventEnd: string;
};

type Row = {
  bleacher_number: number;
  bleacher_rows: number;
  bleacher_seats: number;
  summer: { home_base_name: string } | null;
  winter: { home_base_name: string } | null;
  bleacher_events: {
    event: {
      event_name: string;
      event_start: string;
      event_end: string;
    };
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
      bleacher_number,
      bleacher_rows,
      bleacher_seats,
      summer:HomeBases!Bleachers_home_base_id_fkey(home_base_name),
      winter:HomeBases!Bleachers_winter_home_base_id_fkey(home_base_name),
      bleacher_events:BleacherEvents!BleacherEvents_bleacher_id_fkey(
        event:Events!BleacherEvents_event_id_fkey(
          event_name,
          event_start,
          event_end
        )
      )
      `
    )
    .overrideTypes<Row[], { merge: false }>();

  if (error) {
    createErrorToast(["Failed to fetch Dashboard Bleachers.", error.message]);
  }
  // console.log("data", data);
  const bleachers: Bleacher[] = (data ?? []).map((r) => ({
    bleacherNumber: r.bleacher_number,
    bleacherRows: r.bleacher_rows,
    bleacherSeats: r.bleacher_seats,
    summerHomeBase: r.summer?.home_base_name ?? "",
    winterHomeBase: r.winter?.home_base_name ?? "",
    bleacherEvents: r.bleacher_events.map((be) => ({
      eventName: be.event.event_name,
      eventStart: be.event.event_start,
      eventEnd: be.event.event_end,
    })),
  }));

  console.log("bleachers", bleachers);

  return { bleachers };
}
