"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export type ZoneDriverOption = {
  driverUuid: string;
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  clerkUserId: string | null;
  zoneNames: string[];
};

export function useZoneDrivers() {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["zone-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Drivers")
        .select(
          `
          id,
          user:Users!Drivers_user_uuid_fkey(id, clerk_user_id, first_name, last_name),
          zones:DriverZones(zone:Zones(display_name))
        `,
        )
        .eq("is_active", true);

      if (error) throw error;

      const drivers = (data || []).map((d): ZoneDriverOption => {
        const user = d.user as any;
        const zoneNames = ((d.zones as any[]) || [])
          .map((z: any) => z.zone?.display_name)
          .filter(Boolean);

        return {
          driverUuid: d.id,
          userUuid: user?.id ?? "",
          firstName: user?.first_name ?? null,
          lastName: user?.last_name ?? null,
          clerkUserId: user?.clerk_user_id ?? null,
          zoneNames,
        };
      });

      drivers.sort((a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      return drivers;
    },
  });
}
