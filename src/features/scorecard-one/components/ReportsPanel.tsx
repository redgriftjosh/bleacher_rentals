"use client";

import { useMemo, useState } from "react";
import type { ReportRow } from "../hooks/useScorecardInsights";

type ReportsPanelProps = {
  rows: ReportRow[];
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ReportsPanel({ rows }: ReportsPanelProps) {
  const [status, setStatus] = useState<string>("all");
  const [managerUuid, setManagerUuid] = useState<string>("all");

  const managers = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      map.set(r.managerUuid, r.managerName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus = status === "all" || row.status === status;
      const matchesManager = managerUuid === "all" || row.managerUuid === managerUuid;
      return matchesStatus && matchesManager;
    });
  }, [managerUuid, rows, status]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        acc.quoteCount += 1;
        if (row.status === "booked") {
          acc.bookedCount += 1;
          acc.bookedValueCents += row.revenueCents;
        }
        if (row.status === "quoted") {
          acc.quotedValueCents += row.revenueCents;
        }
        return acc;
      },
      { quoteCount: 0, bookedCount: 0, bookedValueCents: 0, quotedValueCents: 0 },
    );
  }, [filtered]);

  const winRate = totals.quoteCount > 0 ? (totals.bookedCount / totals.quoteCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="quoted">Quoted</option>
            <option value="booked">Booked</option>
            <option value="lost">Lost</option>
          </select>

          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={managerUuid}
            onChange={(e) => setManagerUuid(e.target.value)}
          >
            <option value="all">All account managers</option>
            {managers.map(([uuid, name]) => (
              <option key={uuid} value={uuid}>
                {name}
              </option>
            ))}
          </select>

          <div className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-gray-600">
            Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">Quotes</p>
            <p className="text-lg font-semibold">{totals.quoteCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">Booked</p>
            <p className="text-lg font-semibold">{totals.bookedCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">Booked Value</p>
            <p className="text-lg font-semibold">{formatMoney(totals.bookedValueCents)}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">Win Rate</p>
            <p className="text-lg font-semibold">{winRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2">Account Manager</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Event Start</th>
                <th className="text-right px-4 py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.eventId} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{row.eventName}</td>
                  <td className="px-4 py-2 text-gray-700">{row.managerName}</td>
                  <td className="px-4 py-2 text-gray-700 capitalize">{row.status}</td>
                  <td className="px-4 py-2 text-gray-700">{row.eventStart || "-"}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatMoney(row.revenueCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
