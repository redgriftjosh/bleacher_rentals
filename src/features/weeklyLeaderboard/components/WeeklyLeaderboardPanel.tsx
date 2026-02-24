"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWeeklyBookedLeaderboard } from "../hooks/useWeeklyBookedLeaderboard";

function formatCurrency(value: number): string {
  return `$${(value / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function getRankStyles(rank: number) {
  if (rank === 1) {
    return {
      badge: "bg-amber-500 text-white border-amber-600",
      card: "border-2 border-amber-400 bg-amber-100",
      row: "bg-amber-50",
      avatar: "ring-2 ring-amber-500",
    };
  }

  if (rank === 2) {
    return {
      badge: "bg-slate-500 text-white border-slate-600",
      card: "border-2 border-slate-400 bg-slate-100",
      row: "bg-slate-50",
      avatar: "ring-2 ring-slate-500",
    };
  }

  if (rank === 3) {
    return {
      badge: "bg-orange-600 text-white border-orange-700",
      card: "border-2 border-orange-400 bg-orange-100",
      row: "bg-orange-50",
      avatar: "ring-2 ring-orange-500",
    };
  }

  return {
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    card: "border-gray-200 bg-gray-50",
    row: "",
    avatar: "",
  };
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
          {topThree.map((row, idx) => {
            const rank = idx + 1;
            const rankStyles = getRankStyles(rank);

            return (
              <div key={row.userUuid} className={`border rounded-lg p-4 ${rankStyles.card}`}>
                <div className="flex items-center gap-3">
                  <Avatar className={`w-10 h-10 ${rankStyles.avatar}`}>
                    <AvatarImage src={row.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {row.firstName?.[0] ?? row.lastName?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p
                      className={`inline-flex items-center justify-center min-w-8 h-6 px-2 rounded-full border text-xs font-bold ${rankStyles.badge}`}
                    >
                      #{rank}
                    </p>
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
            );
          })}
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
              {sorted.map((row, idx) => {
                const rank = idx + 1;
                const rankStyles = getRankStyles(rank);

                return (
                  <tr key={row.userUuid} className={`border-t border-gray-100 ${rankStyles.row}`}>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center justify-center min-w-8 h-6 px-2 rounded-full border text-xs font-bold ${rankStyles.badge}`}
                      >
                        #{rank}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-900">
                      <div className="flex items-center gap-2">
                        <Avatar className={`w-7 h-7 ${rankStyles.avatar}`}>
                          <AvatarImage src={row.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {row.firstName?.[0] ?? row.lastName?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(row.bookedValueCents)}
                    </td>
                  </tr>
                );
              })}
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
