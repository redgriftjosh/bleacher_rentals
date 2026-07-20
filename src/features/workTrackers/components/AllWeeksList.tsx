"use client";

import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { useAllWorkTrackerWeeks } from "../hooks/useAllWorkTrackerWeeks";

export function AllWeeksList() {
  const router = useRouter();
  const { weeks: data, isLoading } = useAllWorkTrackerWeeks();

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
    <tbody>
      {data?.map((row, index) => {
        const start = DateTime.fromISO(row);
        const end = start.plus({ days: 6 });
        const label = `${start.toFormat("MMMM d")} - ${end.toFormat("MMMM d")}`;
        return (
          <tr
            key={index}
            className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
            onClick={() => router.push(`/work-trackers/${row}`)}
          >
            <td className="py-1 px-3 text-left">{label}</td>
          </tr>
        );
      })}
    </tbody>
  );
}
