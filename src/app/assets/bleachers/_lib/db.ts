"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { InsertBleacher, RawHomeBase, UpdateBleacher } from "./types";
import { RawBleacher, FormattedBleacher } from "./types";
import { useAuth } from "@clerk/nextjs";
import { createClient } from "@/utils/supabase/client";

// Fetching the list of bleachers that you see. Needed to join the Home bases on them.
export function fetchBleachers() {
  const bleachers = useBleachersStore((s) => s.bleachers) as RawBleacher[];
  const homeBases = useHomeBasesStore((s) => s.homeBases) as RawHomeBase[];

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
  const supabase = createClient(token);
  await supabase.from("Bleachers").insert(bleacher);
}

export async function updateBleacher(bleacher: UpdateBleacher, token: string) {
  console.log("Updating bleacher", token);
  const supabase = createClient(token);
  await supabase.from("Bleachers").update(bleacher).eq("bleacher_id", bleacher.bleacher_id);
}
