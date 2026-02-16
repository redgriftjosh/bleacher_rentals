"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WeeksList } from "./WeeksList";
import type { AccountManagerScorecard } from "../types";

type LeaderboardMetric = "bookedValue" | "salesCount" | "quotesCount";

type LeaderboardPanelProps = {
  scorecards: AccountManagerScorecard[];
};

type Row = {
  userUuid: string;
  name: string;
  avatarUrl: string | null;
  value: number;
};

function metricLabel(metric: LeaderboardMetric): string {
  if (metric === "salesCount") return "Sales";
  if (metric === "quotesCount") return "Quotes";
  return "Booked Value";
}

function formatValue(metric: LeaderboardMetric, value: number): string {
  if (metric === "bookedValue") {
    return `$${(value / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return value.toLocaleString("en-US");
}

export function LeaderboardPanel({ scorecards }: LeaderboardPanelProps) {
  const [metric, setMetric] = useState<LeaderboardMetric>("bookedValue");

  const rows = useMemo<Row[]>(() => {
    const mapped = scorecards.map((sc) => {
      const value =
        metric === "bookedValue"
          ? sc.weekly.valueOfSalesCents
          : metric === "salesCount"
            ? sc.weekly.sales
            : sc.weekly.quotes;

      return {
        userUuid: sc.manager.userUuid,
        name: `${sc.manager.firstName ?? ""} ${sc.manager.lastName ?? ""}`.trim() || "Unknown",
        avatarUrl: sc.manager.avatarUrl,
        value,
      };
    });

    return mapped.sort((a, b) => b.value - a.value);
  }, [metric, scorecards]);

  const topThree = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Leaderboard</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                metric === "bookedValue" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
              onClick={() => setMetric("bookedValue")}
            >
              Value
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                metric === "salesCount" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
              onClick={() => setMetric("salesCount")}
            >
              Sales
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                metric === "quotesCount" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
              onClick={() => setMetric("quotesCount")}
            >
              Quotes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {topThree.map((row, idx) => (
            <div key={row.userUuid} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={row.avatarUrl ?? undefined} />
                  <AvatarFallback>{row.name[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-gray-500">#{idx + 1}</p>
                  <p className="font-semibold text-gray-900">{row.name}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">{metricLabel(metric)}</p>
              <p className="text-xl font-bold text-gray-900">{formatValue(metric, row.value)}</p>
            </div>
          ))}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Rank</th>
                <th className="text-left px-4 py-2">Account Manager</th>
                <th className="text-right px-4 py-2">{metricLabel(metric)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.userUuid} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-semibold text-gray-700">#{idx + 1}</td>
                  <td className="px-4 py-2 text-gray-900">{row.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatValue(metric, row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Weekly Drilldown</h3>
        <WeeksList />
      </div>
    </div>
  );
}
