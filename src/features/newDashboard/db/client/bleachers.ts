"use client";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../../database.types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export type Bleacher = Pick<Tables<"Bleachers">, "bleacher_number">;
export type BleachersResponse = { bleachers: Bleacher[] };

export async function FetchDashboardBleachers(token: string | null): Promise<BleachersResponse> {
  if (!token) {
    createErrorToast(["No token found"]);
  }

  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Bleachers")
    .select("bleacher_number")
    .overrideTypes<Bleacher[], { merge: false }>();

  if (error) {
    createErrorToast(["Failed to fetch Dashboard Bleachers.", error.message]);
  }

  // const testData: Bleacher[] = [];
  // for (let i = 0; i < 100000000; i++) {
  //   testData.push({ bleacher_number: i });
  // }
  // return { bleachers: testData };
  return { bleachers: data ?? [] };
}
