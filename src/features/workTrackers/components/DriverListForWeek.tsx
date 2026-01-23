"use client";

import { fetchDriversForWeek, checkUserAccess } from "../db/db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useUser } from "@clerk/nextjs";
import { useUsersStore } from "@/state/userStore";
import { useState } from "react";

type Props = {
  startDate: string;
};

export function DriverListForWeek({ startDate }: Props) {
  const router = useRouter();
  const supabase = useClerkSupabaseClient();
  const { user } = useUser();
  const users = useUsersStore((s) => s.users);
  const [showAllDrivers, setShowAllDrivers] = useState(false);

  // Get current user's ID from metadata or Clerk ID
  const getCurrentUserUuid = () => {
    // const metaId = user?.publicMetadata?.user_id as string | number | undefined;
    // if (metaId !== undefined && metaId !== null) {
    //   const num = typeof metaId === "string" ? parseInt(metaId, 10) : metaId;
    //   if (!Number.isNaN(num)) return num as number;
    // }
    const clerkId = user?.id;
    if (clerkId) {
      const match = users.find((u) => u.clerk_user_id === clerkId);
      if (match) return match.id;
    }
    return null;
  };

  const currentUserUuid = getCurrentUserUuid();

  // Check user access
  const { data: accessData, isLoading: accessLoading } = useQuery({
    queryKey: ["user-access", currentUserUuid],
    queryFn: async () => {
      if (!currentUserUuid) return null;
      return checkUserAccess(supabase, currentUserUuid);
    },
    enabled: !!currentUserUuid && !!supabase,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["drivers-for-week", startDate, showAllDrivers, currentUserUuid],
    queryFn: async () => {
      return fetchDriversForWeek(supabase, startDate, showAllDrivers, currentUserUuid ?? undefined);
    },
    enabled: !!supabase && !!accessData && (accessData.isAdmin || accessData.isAccountManager),
  });
  const drivers = data?.drivers ?? [];

  if (accessLoading) {
    return (
      <tbody className="p-4">
        <tr>
          <td>
            <LoadingSpinner />
          </td>
        </tr>
      </tbody>
    );
  }

  // Check if user has access
  if (!accessData || (!accessData.isAdmin && !accessData.isAccountManager)) {
    return (
      <tbody className="p-4">
        <tr>
          <td className="text-center py-8">
            <div className="text-red-600 font-semibold mb-2">Access Denied</div>
            <div className="text-gray-600 text-sm">
              You must be an Account Manager or Admin to access this page.
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  if (error) {
    return (
      <tbody className="p-4">
        <tr>
          <td>Uh Oh, Something went wrong... 😬</td>
        </tr>
      </tbody>
    );
  }

  if (isLoading) {
    return (
      <tbody className="p-4">
        <tr>
          <td>
            <LoadingSpinner />
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <>
      {/* Toggle button row */}
      <tbody>
        <tr>
          <td className="p-3">
            <button
              onClick={() => setShowAllDrivers(!showAllDrivers)}
              className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded shadow-md hover:bg-lightBlue transition cursor-pointer"
            >
              {showAllDrivers ? "See My Drivers Only" : "See All Drivers"}
            </button>
          </td>
        </tr>
      </tbody>
      {/* Drivers list */}
      <tbody>
        {drivers?.map((row, index) => (
          <tr
            key={index}
            className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
            onClick={() => router.push(`/work-trackers/${startDate}/${row.id.toString()}`)}
          >
            <td className="py-1 px-3 text-left">
              <div className="flex items-center justify-between">
                <span>{row.first_name + " " + row.last_name}</span>
                <span className="text-sm text-gray-500">
                  {row.tripCount} {row.tripCount === 1 ? "trip" : "trips"}
                </span>
              </div>
            </td>
          </tr>
        ))}
        {drivers.length === 0 && (
          <tr>
            <td className="py-4 px-3 text-center text-gray-500">
              {showAllDrivers
                ? "No drivers found in the system."
                : "No drivers are currently assigned to you."}
            </td>
          </tr>
        )}
      </tbody>
    </>
  );
}
