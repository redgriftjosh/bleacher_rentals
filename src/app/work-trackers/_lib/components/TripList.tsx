"use client";

import { useAuth } from "@clerk/nextjs";
import { fetchDrivers, fetchWorkTrackersForUserIdAndStartDate } from "../db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";
import { calculateFinancialTotals } from "../../[userId]/[startDate]/pdf/_lib/util";

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
      {data?.workTrackers.map((row, index) => (
        <tr
          key={index}
          className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
        >
          <th className={`w-[8%] ${className}`}>{row.workTracker.date}</th>
          <th className={`w-[8%] ${className}`}>{row.bleacherNumber}</th>
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
      ))}
      <tr className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer">
        <th className={`w-[8%] ${classNameBold}`}>SubTotal</th>
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
      <tr className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer">
        <th className={`w-[8%] ${classNameBold}`}>{`HST (${data?.driverTax}%)`}</th>
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
      <tr className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer">
        <th className={`w-[8%] ${classNameBold}`}>Total Amount To Be Paid</th>
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
