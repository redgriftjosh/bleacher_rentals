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
import type { Granularity, TrendPoint } from "../utils/aggregate";
import { SCORE_DENOMINATOR } from "../utils/formatScore";

const GRANULARITY_NOUN: Record<Granularity, string> = {
  day: "day",
  week: "week",
  month: "month",
};

type ScoreTrendChartProps = {
  points: TrendPoint[];
  granularity: Granularity;
};

/**
 * Average score per week or per month, whichever the reader picked. The week is
 * Monday to Sunday — the sales scorecard's week.
 *
 * The Y axis is pinned to the full 1-10 range rather than fitted to the data.
 * An auto-scaled axis turns a drift from 8.4 to 8.1 into a cliff, and this
 * chart is read by people deciding whether something got worse.
 *
 * The axis shows each week by its Monday; the tooltip spells out the whole
 * span, so a point can be matched to a date range without counting days.
 */
export default function ScoreTrendChart({ points, granularity }: ScoreTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
        No answers yet — the first scores will appear here as drivers submit them.
      </div>
    );
  }

  // `axisLabel` is the short form the aggregation already produced — the full
  // span goes in the tooltip, where there is room for it.
  const data = points;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Average score by {GRANULARITY_NOUN[granularity]}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="axisLabel" tick={{ fontSize: 12 }} />
            <YAxis
              domain={[1, SCORE_DENOMINATOR]}
              ticks={[2, 4, 6, 8, 10]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.label ?? _label}
              formatter={(value, _name, item) => [
                `${value ?? "—"}/${SCORE_DENOMINATOR} (${item?.payload?.count ?? 0} answers)`,
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
