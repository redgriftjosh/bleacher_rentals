"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export type ZoneAccountManagerOption = {
  accountManagerUuid: string;
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  clerkUserId: string | null;
  zoneNames: string[];
};

export function useZoneAccountManagers() {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["zone-account-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AccountManagers")
        .select(
          `
          id,
          user:Users!AccountManagers_user_uuid_fkey(id, clerk_user_id, first_name, last_name),
          zones:AccountManagerZones(zone:Zones(display_name))
        `,
        )
        .eq("is_active", true);

      if (error) throw error;

      return (data || []).map((am): ZoneAccountManagerOption => {
        const user = am.user as any;
        const zoneNames = ((am.zones as any[]) || [])
          .map((z: any) => z.zone?.display_name)
          .filter(Boolean);

        return {
          accountManagerUuid: am.id,
          userUuid: user?.id ?? "",
          firstName: user?.first_name ?? null,
          lastName: user?.last_name ?? null,
          clerkUserId: user?.clerk_user_id ?? null,
          zoneNames,
        };
      });
    },
  });
}
