"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../utils/aggregate";

const MONTH_LABEL = (month: string): string => {
  const [year, monthPart] = month.split("-");
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

type ScoreTrendChartProps = {
  points: TrendPoint[];
};

/**
 * Average score by month.
 *
 * The Y axis is pinned to the full 1-10 range rather than fitted to the data.
 * An auto-scaled axis turns a drift from 8.4 to 8.1 into a cliff, and this
 * chart is read by people deciding whether something got worse.
 */
export default function ScoreTrendChart({ points }: ScoreTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
        No answers yet — the first scores will appear here as drivers submit them.
      </div>
    );
  }

  const data = points.map((point) => ({
    ...point,
    label: MONTH_LABEL(point.month),
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Average score by month
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis domain={[1, 10]} ticks={[2, 4, 6, 8, 10]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, _name, item) => [
                `${value ?? "—"} (${item?.payload?.count ?? 0} answers)`,
                "Average",
              ]}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#10365A"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
