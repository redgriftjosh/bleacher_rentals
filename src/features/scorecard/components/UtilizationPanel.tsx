"use client";

import type { UtilizationPoint } from "../hooks/useScorecardInsights";

type UtilizationPanelProps = {
  currentWeek: UtilizationPoint;
  recentWeeks: UtilizationPoint[];
  bleacherCount: number;
};

export function UtilizationPanel({
  currentWeek,
  recentWeeks,
  bleacherCount,
}: UtilizationPanelProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bleacher Utilization</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">This Week Utilization</p>
            <p className="text-2xl font-bold text-gray-900">{currentWeek.utilizationPct.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">Booked Bleacher-Days</p>
            <p className="text-2xl font-bold text-gray-900">{currentWeek.bookedBleacherDays}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-500">Active Bleachers</p>
            <p className="text-2xl font-bold text-gray-900">{bleacherCount}</p>
          </div>
        </div>

        <div className="space-y-2">
          {recentWeeks.map((point) => (
            <div key={point.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{point.label}</span>
                <span className="text-gray-900 font-medium">{point.utilizationPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(point.utilizationPct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
