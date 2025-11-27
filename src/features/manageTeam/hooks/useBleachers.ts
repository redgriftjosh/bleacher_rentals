"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export type BleacherOption = {
  bleacherId: number;
  bleacherNumber: number;
  homeBaseName: string;
  winterHomeBaseName: string;
  bleacherRows: number;
  bleacherSeats: number;
  summerAccountManagerId: number | null;
  winterAccountManagerId: number | null;
  summerAssignedUser: {
    userId: number;
    clerkUserId: string;
    firstName: string;
    lastName: string;
  } | null;
  winterAssignedUser: {
    userId: number;
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
          bleacher_id,
          bleacher_number,
          bleacher_rows,
          bleacher_seats,
          summer_account_manager_id,
          winter_account_manager_id,
          home_base:HomeBases!Bleachers_home_base_id_fkey(home_base_name),
          winter_home_base:HomeBases!Bleachers_winter_home_base_id_fkey(home_base_name),
          summer_account_manager:AccountManagers!Bleachers_summer_account_manager_id_fkey(
            account_manager_id,
            user:Users(user_id, clerk_user_id, first_name, last_name)
          ),
          winter_account_manager:AccountManagers!Bleachers_winter_account_manager_id_fkey(
            account_manager_id,
            user:Users(user_id, clerk_user_id, first_name, last_name)
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
          bleacherId: b.bleacher_id,
          bleacherNumber: b.bleacher_number,
          homeBaseName: (b.home_base as any)?.home_base_name || "Unknown",
          winterHomeBaseName: (b.winter_home_base as any)?.home_base_name || "Unknown",
          bleacherRows: b.bleacher_rows,
          bleacherSeats: b.bleacher_seats,
          summerAccountManagerId: b.summer_account_manager_id,
          winterAccountManagerId: b.winter_account_manager_id,
          summerAssignedUser: summerUser
            ? {
                userId: summerUser.user_id,
                clerkUserId: summerUser.clerk_user_id,
                firstName: summerUser.first_name,
                lastName: summerUser.last_name,
              }
            : null,
          winterAssignedUser: winterUser
            ? {
                userId: winterUser.user_id,
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
