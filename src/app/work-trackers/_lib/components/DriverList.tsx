"use client";

import { useAuth } from "@clerk/nextjs";
import { fetchDrivers } from "../db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";

export function DriverList() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchDrivers(token);
    },
  });
  const drivers = data?.drivers ?? [];

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
    <tbody>
      {drivers?.map((row, index) => (
        <tr
          key={index}
          className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
          onClick={() => router.push(`/work-trackers/${row.user_id.toString()}`)}
        >
          <td className="py-1 px-3 text-left">{row.first_name + " " + row.last_name}</td>
        </tr>
      ))}
    </tbody>
  );
}
