"use client";

import { useUsersStore } from "@/state/userStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useEffect, useState } from "react";

export type AccountManagerOption = {
  accountManagerId: number;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  clerkUserId: string | null;
};

/**
 * Hook to fetch all account managers with their account_manager_id from the database
 */
export function useAccountManagers(): AccountManagerOption[] {
  const users = useUsersStore((s) => s.users);
  const supabase = useClerkSupabaseClient();
  const [accountManagers, setAccountManagers] = useState<AccountManagerOption[]>([]);

  useEffect(() => {
    async function fetchAccountManagers() {
      try {
        // Fetch all active account managers with their user details
        const { data, error } = await supabase
          .from("AccountManagers")
          .select(`
            account_manager_id,
            user_id,
            is_active,
            Users (
              first_name,
              last_name,
              email,
              clerk_user_id
            )
          `)
          .eq("is_active", true);

        if (error) throw error;

        if (data) {
          const managers = data.map((am) => ({
            accountManagerId: am.account_manager_id,
            userId: am.user_id,
            firstName: (am.Users as any)?.first_name || null,
            lastName: (am.Users as any)?.last_name || null,
            email: (am.Users as any)?.email || "",
            clerkUserId: (am.Users as any)?.clerk_user_id || null,
          }));

          setAccountManagers(managers);
        }
      } catch (error) {
        console.error("Error fetching account managers:", error);
        setAccountManagers([]);
      }
    }

    fetchAccountManagers();
  }, [users, supabase]); // Re-fetch when users change

  return accountManagers;
}
