"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export type ZoneBleacherOption = {
  bleacherUuid: string;
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  summerHomeBaseName: string;
  winterHomeBaseName: string;
  zoneUuid: string | null;
  zoneName: string | null;
};

export function useZoneBleachers() {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["zone-bleachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Bleachers")
        .select(
          `
          id,
          bleacher_number,
          bleacher_rows,
          bleacher_seats,
          zone_uuid,
          summer_home_base:HomeBases!bleachers_summer_home_base_uuid_fkey(home_base_name),
          winter_home_base:HomeBases!bleachers_winter_home_base_uuid_fkey(home_base_name),
          zone:Zones!Bleachers_zone_uuid_fkey(display_name)
        `,
        )
        .eq("deleted", false)
        .order("bleacher_number", { ascending: true });

      if (error) throw error;

      return (data || []).map((b): ZoneBleacherOption => ({
        bleacherUuid: b.id,
        bleacherNumber: b.bleacher_number,
        bleacherRows: b.bleacher_rows,
        bleacherSeats: b.bleacher_seats,
        summerHomeBaseName: (b.summer_home_base as any)?.home_base_name || "Unknown",
        winterHomeBaseName: (b.winter_home_base as any)?.home_base_name || "Unknown",
        zoneUuid: b.zone_uuid,
        zoneName: (b.zone as any)?.display_name || null,
      }));
    },
  });
}
