"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

type StatHistoryChartProps = {
  data: Array<{ label: string; value: number }>;
  metricLabel: string;
  activeView: string;
};

export function StatHistoryChart({ data, metricLabel, activeView }: StatHistoryChartProps) {
  if (activeView !== "Line") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="h-72 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">{activeView} view</p>
            <p className="text-xs text-gray-400">Placeholder only</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              stroke="#9CA3AF"
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" axisLine={false} tickLine={false} />
            <RechartsTooltip
              formatter={(value) => [value, metricLabel]}
              contentStyle={{
                fontSize: "12px",
                padding: "6px 8px",
                borderRadius: "8px",
                borderColor: "#E5E7EB",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              itemStyle={{ padding: 0, margin: 0 }}
              labelStyle={{ marginBottom: 4, fontWeight: 600, color: "#111827" }}
            />
            <Line type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
