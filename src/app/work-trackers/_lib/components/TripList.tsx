"use client";

import { useAuth } from "@clerk/nextjs";
import { fetchDrivers, fetchWorkTrackersForUserIdAndStartDate } from "../db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  startDate: string;
};

export function TripList({ userId, startDate }: Props) {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["work-trackers", userId, startDate],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchWorkTrackersForUserIdAndStartDate(token, userId, startDate);
    },
  });

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

  const className = "py-1 text-center text-xs font-light border-r";
  return (
    <tbody>
      {data?.map((row, index) => (
        <tr
          key={index}
          className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
        >
          <th className={`w-[8%] ${className}`}>{row.date}</th>
          <th className={`w-[8%] ${className}`}>{row.bleacher_id}</th>
          <th className={`w-[12%] ${className}`}>Pickup Location</th>
          <th className={`w-[8%] ${className}`}>{row.pickup_poc}</th>
          <th className={`w-[7%] ${className}`}>{row.pickup_time}</th>
          <th className={`w-[12%] ${className}`}>Dropoff Location</th>
          <th className={`w-[8%] ${className}`}>{row.dropoff_poc}</th>
          <th className={`w-[7%] ${className}`}>{row.dropoff_time}</th>
          <th className={`w-[8%] ${className}`}>Pay</th>
          <th className={` ${className}`}>{row.notes}</th>
        </tr>
      ))}
    </tbody>
  );
}
