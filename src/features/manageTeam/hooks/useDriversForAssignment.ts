"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { STATUSES } from "../constants";

export type DriverOption = {
  driverUuid: string;
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  clerkUserId: string | null;
  accountManagerUuid: string | null;
  assignedUser: {
    userUuid: string;
    clerkUserId: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

/**
 * Fetch all active drivers with their account manager assignment info.
 * Used for the driver assignment multi-select on the Account Manager page.
 */
export function useDriversForAssignment() {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["drivers-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Drivers")
        .select(
          `
          id,
          account_manager_uuid,
          user:Users!Drivers_user_uuid_fkey(id, clerk_user_id, first_name, last_name, status_uuid),
          account_manager:AccountManagers!Drivers_account_manager_uuid_fkey(
            id,
            am_user:Users(id, clerk_user_id, first_name, last_name)
          )
        `,
        )
        .eq("is_active", true)
        .order("id");

      if (error) throw error;

      const driverList: DriverOption[] = (data || [])
        // Exclude drivers whose user account has been deactivated.
        .filter((d) => (d.user as any)?.status_uuid !== STATUSES.inactive)
        .map((d) => {
        const user = d.user as any;
        const am = d.account_manager as any;
        const amUser = am?.am_user;

        return {
          driverUuid: d.id,
          userUuid: user?.id ?? "",
          firstName: user?.first_name ?? null,
          lastName: user?.last_name ?? null,
          clerkUserId: user?.clerk_user_id ?? null,
          accountManagerUuid: d.account_manager_uuid,
          assignedUser: amUser
            ? {
                userUuid: amUser.id,
                clerkUserId: amUser.clerk_user_id,
                firstName: amUser.first_name,
                lastName: amUser.last_name,
              }
            : null,
        };
      });

      // Sort by name
      driverList.sort((a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      return driverList;
    },
  });
}
