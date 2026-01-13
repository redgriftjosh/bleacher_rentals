"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export type BleacherOption = {
  bleacherUuid: string;
  bleacherNumber: number;
  summerHomeBaseName: string;
  winterHomeBaseName: string;
  bleacherRows: number;
  bleacherSeats: number;
  summerAccountManagerUuid: string | null;
  winterAccountManagerUuid: string | null;
  summerAssignedUser: {
    userUuid: string;
    clerkUserId: string;
    firstName: string;
    lastName: string;
  } | null;
  winterAssignedUser: {
    userUuid: string;
    clerkUserId: string;
    firstName: string;
    lastName: string;
  } | null;
};

/**
 * Hook to fetch all bleachers with their home base information and account manager assignments
 */
export function useBleachers() {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["bleachers-with-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Bleachers")
        .select(
          `
          id,
          bleacher_number,
          bleacher_rows,
          bleacher_seats,
          summer_account_manager_uuid,
          winter_account_manager_uuid,
          summer_home_base:HomeBases!bleachers_summer_home_base_uuid_fkey(home_base_name),
          winter_home_base:HomeBases!bleachers_winter_home_base_uuid_fkey(home_base_name),
          summer_account_manager:AccountManagers!Bleachers_summer_account_manager_uuid_fkey(
            id,
            user:Users(id, clerk_user_id, first_name, last_name)
          ),
          winter_account_manager:AccountManagers!Bleachers_winter_account_manager_uuid_fkey(
            id,
            user:Users(id, clerk_user_id, first_name, last_name)
          )
        `
        )
        .order("bleacher_number", { ascending: true });

      if (error) throw error;

      const bleacherList: BleacherOption[] = (data || []).map((b) => {
        const summerAM = b.summer_account_manager as any;
        const winterAM = b.winter_account_manager as any;
        const summerUser = summerAM?.user;
        const winterUser = winterAM?.user;

        return {
          bleacherUuid: b.id,
          bleacherNumber: b.bleacher_number,
          summerHomeBaseName: (b.summer_home_base as any)?.home_base_name || "Unknown",
          winterHomeBaseName: (b.winter_home_base as any)?.home_base_name || "Unknown",
          bleacherRows: b.bleacher_rows,
          bleacherSeats: b.bleacher_seats,
          summerAccountManagerUuid: b.summer_account_manager_uuid,
          winterAccountManagerUuid: b.winter_account_manager_uuid,
          summerAssignedUser: summerUser
            ? {
                userUuid: summerUser.id,
                clerkUserId: summerUser.clerk_user_id,
                firstName: summerUser.first_name,
                lastName: summerUser.last_name,
              }
            : null,
          winterAssignedUser: winterUser
            ? {
                userUuid: winterUser.id,
                clerkUserId: winterUser.clerk_user_id,
                firstName: winterUser.first_name,
                lastName: winterUser.last_name,
              }
            : null,
        };
      });

      return bleacherList;
    },
  });
}
