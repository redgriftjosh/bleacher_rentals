"use client";

import { Flag, History, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip } from "recharts";
import { useSearchParams } from "next/navigation";

const THIS_WEEK = {
  quotesSent: 42,
  goal: 98,
  paceTarget: 42,
  dayOfWeek: 3,
  daysInWeek: 7,
};

const LAST_WEEK = {
  totalQuotes: 76,
  paceAtDay: 36,
  goal: 98,
  dayOfWeek: 3,
  daysInWeek: 7,
};

const CHART_POINTS = [
  { day: "M", dayLabel: "Monday", thisWeek: 6, lastWeek: 8 },
  { day: "T", dayLabel: "Tuesday", thisWeek: 14, lastWeek: 17 },
  { day: "W", dayLabel: "Wednesday", thisWeek: 22, lastWeek: 26 },
  { day: "T", dayLabel: "Thursday", thisWeek: null, lastWeek: 39 },
  { day: "F", dayLabel: "Friday", thisWeek: null, lastWeek: 52 },
  { day: "S", dayLabel: "Saturday", thisWeek: null, lastWeek: 64 },
  { day: "S", dayLabel: "Sunday", thisWeek: null, lastWeek: 76 },
];

export function CompactDetailedStatWithGraph() {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.set("dataType", "quotes-sent");
  if (!params.get("timeRange")) params.set("timeRange", "weekly");
  if (!params.get("accountManager")) params.set("accountManager", "all");
  const historyHref = `/scorecard?${params.toString()}`;
  const paceDelta = THIS_WEEK.paceTarget - THIS_WEEK.quotesSent;
  const paceStatus = paceDelta <= 0 ? "good" : paceDelta <= 5 ? "warn" : "bad";

  const paceColor =
    paceStatus === "good"
      ? "text-green-600"
      : paceStatus === "warn"
        ? "text-amber-500"
        : "text-red-600";
  const paceBadge =
    paceStatus === "good" ? "bg-green-100" : paceStatus === "warn" ? "bg-amber-100" : "bg-red-100";
  const paceIcon = paceStatus === "good" ? "✅" : paceStatus === "warn" ? "⚠️" : "⛔";

  const thisWeekValues = CHART_POINTS.map((p) => p.thisWeek).filter(
    (value): value is number => typeof value === "number",
  );
  const maxThisWeek = thisWeekValues.length > 0 ? Math.max(...thisWeekValues) : 0;
  const maxLastWeek = Math.max(...CHART_POINTS.map((p) => p.lastWeek));
  const maxYAxis = Math.max(THIS_WEEK.goal, maxThisWeek, maxLastWeek);

  const weekdayTarget = THIS_WEEK.goal / 5;
  const chartData = CHART_POINTS.map((point, idx) => {
    const dayNumber = idx + 1; // Mon=1 ... Sun=7
    const paceValue = dayNumber <= 5 ? weekdayTarget * dayNumber : THIS_WEEK.goal;
    return {
      ...point,
      pace: Math.round(paceValue),
    };
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
      <div className="flex items-start justify-between">
        <span className="text-2xl font-semibold text-gray-500 -mt-2 mb-4 inline-block">
          Quotes Sent
        </span>
        <Link
          href={historyHref}
          className="text-gray-400 hover:text-gray-600 transition"
          aria-label="View quotes sent history"
          title="View history"
        >
          <History className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-green-600 tracking-wide">
            THIS WEEK
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-green-600">{THIS_WEEK.quotesSent}</span>
            <span className="text-sm font-medium text-gray-400">/ 42</span>
            {/* <TrendingUp className="h-4 w-4 -ml-1 text-gray-400" /> */}
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{THIS_WEEK.goal}</span>
            <Target className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-gray-400 tracking-wide">
            LAST WEEK
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-gray-400">{LAST_WEEK.paceAtDay}</span>
            {/* <TrendingUp className="h-4 w-4 -ml-1 text-gray-400" /> */}
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{LAST_WEEK.totalQuotes}</span>
            <Flag className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="mt-4 border border-gray-200 rounded-lg p-3">
        {/* <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">Weekly trend</p>
          <span className={`text-xs font-medium ${paceColor}`}>Pace status {paceIcon}</span>
        </div> */}
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                stroke="#9CA3AF"
                axisLine={false}
                tickLine={false}
                interval={0}
                padding={{ left: 8, right: 8 }}
                tickMargin={6}
              />
              {/* <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9CA3AF"
                domain={[0, maxYAxis]}
                width={28}
                axisLine={false}
                tickLine={false}
              /> */}
              <RechartsTooltip
                formatter={(value, name) => {
                  const numericValue = typeof value === "number" ? value : 0;
                  if (name === "pace") return [numericValue, "Pace"];
                  if (name === "lastWeek") return [numericValue, "Last week"];
                  return [numericValue, "This week"];
                }}
                labelFormatter={(_, payload) => {
                  const dayLabel = payload?.[0]?.payload?.dayLabel;
                  return dayLabel ?? "";
                }}
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
              <Line
                type="monotone"
                dataKey="pace"
                stroke="#F97316"
                strokeDasharray="6 6"
                strokeWidth={1}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lastWeek"
                stroke="#9CA3AF"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="thisWeek"
                stroke={
                  paceStatus === "good" ? "#16A34A" : paceStatus === "warn" ? "#F59E0B" : "#DC2626"
                }
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
