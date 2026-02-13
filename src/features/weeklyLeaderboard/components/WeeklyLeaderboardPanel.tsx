"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWeeklyBookedLeaderboard } from "../hooks/useWeeklyBookedLeaderboard";

function formatCurrency(value: number): string {
  return `$${(value / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function WeeklyLeaderboardPanel() {
  const { rows, isLoading, error, weekLabel } = useWeeklyBookedLeaderboard();

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b.bookedValueCents - a.bookedValueCents);
  }, [rows]);

  const topThree = sorted.slice(0, 3);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-gray-500">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-red-500">Failed to load leaderboard.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Weekly Leaderboard</h2>
            <p className="text-sm text-gray-500">Booked value ({weekLabel})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {topThree.map((row, idx) => (
            <div key={row.userUuid} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={row.avatarUrl ?? undefined} />
                  <AvatarFallback>{row.firstName?.[0] ?? row.lastName?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-gray-500">#{idx + 1}</p>
                  <p className="font-semibold text-gray-900">
                    {`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Unknown"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">Booked Value</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(row.bookedValueCents)}
              </p>
            </div>
          ))}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Rank</th>
                <th className="text-left px-4 py-2">Account Manager</th>
                <th className="text-right px-4 py-2">Booked Value</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr key={row.userUuid} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-semibold text-gray-700">#{idx + 1}</td>
                  <td className="px-4 py-2 text-gray-900">
                    {`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Unknown"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatCurrency(row.bookedValueCents)}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No booked events this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
