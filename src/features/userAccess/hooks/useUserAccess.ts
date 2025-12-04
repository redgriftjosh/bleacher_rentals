import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { getUserAccessData } from "../db/getUserAccess.db";
import { determineUserAccess } from "../logic/determineAccess";

/**
 * React Query hook to fetch and determine user access level.
 * Returns the access result and loading/error states.
 */
export function useUserAccess() {
  const { user } = useUser();
  const supabase = useClerkSupabaseClient();

  const {
    data: accessData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["user-access", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("No user ID available");
      }
      const userData = await getUserAccessData(user.id, supabase);
      return determineUserAccess(userData);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter to handle token refresh better
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    refetchOnReconnect: true, // Refetch when network reconnects
    retry: 2, // Retry twice in case of token refresh issues
  });

  return {
    accessLevel: accessData?.accessLevel ?? "denied",
    reason: accessData?.reason,
    isLoading,
    isError,
    error,
  };
}
