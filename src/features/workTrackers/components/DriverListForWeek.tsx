"use client";

import { fetchDriversForWeek, checkUserAccess, DriverWithMeta } from "../db/db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useUser } from "@clerk/nextjs";
import { useUsersStore } from "@/state/userStore";
import { useState } from "react";
import { PaymentStatusButton } from "./PaymentStatusButton";
import { DateTime } from "luxon";

type Props = {
  startDate: string;
};

function RegionFlag({ region }: { region: "US" | "CAN" | null }) {
  if (!region) return null;
  return (
    <span className="text-base leading-none" title={region === "US" ? "United States" : "Canada"}>
      {region === "US" ? "🇺🇸" : "🇨🇦"}
    </span>
  );
}

function formatPay(cents: number, payCurrency: string): string {
  const amount = (cents / 100).toFixed(2);
  const symbol = "$";
  return `${symbol}${amount} ${payCurrency}`;
}

export function DriverListForWeek({ startDate }: Props) {
  const router = useRouter();
  ``;
  const supabase = useClerkSupabaseClient();
  const { user } = useUser();
  const users = useUsersStore((s) => s.users);
  const [showAllDrivers, setShowAllDrivers] = useState(false);

  // Calculate week end date (6 days after start)
  const weekEnd = DateTime.fromISO(startDate).plus({ days: 6 }).toISODate() || startDate;

  const getCurrentUserUuid = () => {
    const clerkId = user?.id;
    if (clerkId) {
      const match = users.find((u) => u.clerk_user_id === clerkId);
      if (match) return match.id;
    }
    return null;
  };

  const currentUserUuid = getCurrentUserUuid();

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
      <tbody>
        {drivers.map((row, index) => (
          <tr
            key={index}
            className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
            onClick={() => router.push(`/work-trackers/${startDate}/${row.id.toString()}`)}
          >
            <td className="py-1 px-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 truncate">
                    {row.first_name + " " + row.last_name}
                    <RegionFlag region={row.region} />
                  </span>
                  <span className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                    {row.totalPayCents > 0 && (
                      <span className="text-green-600 font-medium">
                        {formatPay(row.totalPayCents, row.payCurrency)}
                      </span>
                    )}
                    {row.tripCount} {row.tripCount === 1 ? "trip" : "trips"}
                  </span>
                </div>
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <PaymentStatusButton driver={row} weekStart={startDate} weekEnd={weekEnd} />
                </div>
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
