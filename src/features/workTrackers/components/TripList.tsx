"use client";

import { fetchWorkTrackersForUserUuidAndStartDate } from "../db/db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Tables } from "../../../../database.types";
import { calculateFinancialTotals } from "../util";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import WorkTrackerStatusBadge from "./WorkTrackerStatusBadge";

type Props = {
  userUuid: string;
  startDate: string;
  onSelectWorkTracker?: (workTracker: Tables<"WorkTrackers">) => void;
};

function isCanada(street: string | null | undefined): boolean {
  if (!street) return false;
  return /canada/i.test(street);
}

function isUSA(street: string | null | undefined): boolean {
  if (!street) return false;
  return /usa|united states/i.test(street);
}

export function TripList({ userUuid, startDate, onSelectWorkTracker }: Props) {
  const supabase = useClerkSupabaseClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-trackers", userUuid, startDate],
    queryFn: async () => {
      return fetchWorkTrackersForUserUuidAndStartDate(supabase, userUuid, startDate, false);
    },
  });
  let financialTotals;
  if (data) {
    financialTotals = calculateFinancialTotals(data);
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

  const className = "py-1 text-center text-xs font-light border-r";
  const classNameBold = "py-1 text-center text-xs font-bold border-r";
  return (
    <tbody>
      {data?.workTrackers.map((row, index) => {
        const crossBorder =
          isCanada(data.driverAddress?.street) && isUSA(row.dropoff_address?.street);
        return (
          <tr
            key={index}
            onClick={() => onSelectWorkTracker && onSelectWorkTracker(row.workTracker)}
            className={`border-b h-12 border-gray-200 transition-all duration-100 ease-in-out cursor-pointer ${
              crossBorder ? "bg-yellow-100 hover:bg-yellow-200" : "hover:bg-gray-100"
            }`}
          >
            <th className={`w-0 whitespace-nowrap px-2 ${className}`}>
              <WorkTrackerStatusBadge status={row.workTracker.status} showText={false} />
            </th>
            <th className={`w-[8%] ${className}`}>{row.workTracker.date}</th>
            <th className={`w-[8%] ${className}`}>{row.bleacherNumber}</th>
            <th className={`w-[8%] whitespace-normal ${className}`}>{row.activityType ?? ""}</th>
            <th className={`w-[12%] ${className}`}>{row.pickup_address?.street ?? ""}</th>
            <th className={`w-[8%] ${className}`}>{row.workTracker.pickup_poc}</th>
            <th className={`w-[7%] ${className}`}>{row.workTracker.pickup_time}</th>
            <th className={`w-[12%] ${className}`}>{row.dropoff_address?.street ?? ""}</th>
            <th className={`w-[8%] ${className}`}>{row.workTracker.dropoff_poc}</th>
            <th className={`w-[7%] ${className}`}>{row.workTracker.dropoff_time}</th>
            <th className={`w-[8%] ${className}`}>
              {row.workTracker.pay_cents ? `$${(row.workTracker.pay_cents / 100).toFixed(2)}` : ""}
            </th>
            <th className={` ${className}`}>{row.workTracker.notes}</th>
          </tr>
        );
      })}
      <tr className="border-b h-12 border-gray-200 ">
        <th className={`w-0 ${className}`}></th>
        <th className={`w-[8%] ${classNameBold}`}>SubTotal</th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[12%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[7%] ${className}`}></th>
        <th className={`w-[12%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[7%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}>
          {financialTotals ? `$${(financialTotals.subtotal / 100).toFixed(2)}` : ""}
        </th>
        <th className={` ${className}`}></th>
      </tr>
      <tr className="border-b h-12 border-gray-200 ">
        <th className={`w-0 ${className}`}></th>
        <th className={`w-[8%] ${classNameBold}`}>{`HST (${data?.driverTax}%)`}</th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[12%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[7%] ${className}`}></th>
        <th className={`w-[12%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[7%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}>
          {financialTotals ? `$${(financialTotals.tax / 100).toFixed(2)}` : ""}
        </th>
        <th className={` ${className}`}></th>
      </tr>
      <tr className="border-b h-12 border-gray-200 ">
        <th className={`w-0 ${className}`}></th>
        <th className={`w-[8%] ${classNameBold}`}>Total Amount To Be Paid</th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[12%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[7%] ${className}`}></th>
        <th className={`w-[12%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}></th>
        <th className={`w-[7%] ${className}`}></th>
        <th className={`w-[8%] ${className}`}>
          {financialTotals ? `$${(financialTotals.total / 100).toFixed(2)}` : ""}
        </th>
        <th className={` ${className}`}></th>
      </tr>
    </tbody>
  );
}
