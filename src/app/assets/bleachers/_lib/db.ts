"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { FormattedBleacher } from "./types";
import { createClient } from "@/utils/supabase/client";
import { InsertBleacher, SelectBleacher, UpdateBleacher } from "@/types/tables/Bleachers";
import { SelectHomeBase } from "@/types/tables/HomeBases";
import { checkInsertBleacherFormRules } from "./functions";
import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { supabaseClient } from "@/utils/supabase/supabaseClient";
import { SuccessToast } from "@/components/toasts/SuccessToast";

// Fetching the list of bleachers that you see. Needed to join the Home bases on them.
export function fetchBleachers() {
  const bleachers = useBleachersStore((s) => s.bleachers) as SelectBleacher[];
  const homeBases = useHomeBasesStore((s) => s.homeBases) as SelectHomeBase[];
  // console.log("bleachers:", bleachers);

  if (!bleachers || !homeBases) return [];

  const formattedBleachers: FormattedBleacher[] = bleachers
    .map((bleacher) => {
      const homeBase = homeBases.find((base) => base.home_base_id === bleacher.home_base_id);
      const winterHomeBase = homeBases.find(
        (base) => base.home_base_id === bleacher.winter_home_base_id
      );

      return {
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
      };
    })
    .sort((a, b) => b.bleacherNumber - a.bleacherNumber);

  return formattedBleachers;
}

export async function insertBleacher(bleacher: InsertBleacher, token: string) {
  console.log("inserting bleacher", token);
  const supabase = supabaseClient(token);
  const { error } = await supabase.from("Bleachers").insert(bleacher);
  if (error) {
    console.log("Error inserting bleacher:", error);
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [
            "Error inserting bleacher. Please refresh your page and try again.",
            error.message,
          ],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    throw new Error(`Failed to insert bleacher: ${error.message}`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Bleacher was Created"],
      }),
    { duration: 10000 }
  );
}

export async function updateBleacher(bleacher: UpdateBleacher, token: string) {
  console.log("Updating bleacher", token);
  const supabase = createClient(token);
  await supabase.from("Bleachers").update(bleacher).eq("bleacher_id", bleacher.bleacher_id);
}

/**
 * Fetch all taken bleacher numbers from the Supabase "Bleachers" table.
 * Requires a valid Supabase JWT token.
 */
export async function fetchTakenBleacherNumbers(token: string): Promise<number[]> {
  const supabase = createClient(token);

  const { data, error } = await supabase.from("Bleachers").select("bleacher_number");

  if (error) {
    console.error("Failed to fetch bleacher numbers:", error.message);
    throw new Error("Could not fetch bleacher numbers");
  }

  return data.map((row) => row.bleacher_number).filter((n): n is number => typeof n === "number");
}
