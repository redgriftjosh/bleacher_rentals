"use client";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../../database.types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export type Bleacher = {
  bleacher_number: number;
  bleacher_rows: number;
  bleacher_seats: number;
  summer_home_base: string;
  winter_home_base: string;
};

type RowRaw = {
  bleacher_number: number;
  bleacher_rows: number;
  bleacher_seats: number;
  summer: { home_base_name: string } | null;
  winter: { home_base_name: string } | null;
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
      winter:HomeBases!Bleachers_winter_home_base_id_fkey(home_base_name)
      `
    )
    .overrideTypes<RowRaw[], { merge: false }>();

  if (error) {
    createErrorToast(["Failed to fetch Dashboard Bleachers.", error.message]);
  }
  const bleachers: Bleacher[] = (data ?? []).map((r) => ({
    bleacher_number: r.bleacher_number,
    bleacher_rows: r.bleacher_rows,
    bleacher_seats: r.bleacher_seats,
    summer_home_base: r.summer?.home_base_name ?? "",
    winter_home_base: r.winter?.home_base_name ?? "",
  }));

  // console.log("data", data);

  return { bleachers };
}
