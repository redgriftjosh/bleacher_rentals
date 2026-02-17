"use client";

import type { AccountManagerScorecard, TimeRange } from "../types";
import {
  getCurrentQuarterEnd,
  getCurrentQuarterStart,
  getCurrentYearEnd,
  getCurrentYearStart,
} from "../dateUtils";

type PaceForecastCardProps = {
  scorecards: AccountManagerScorecard[];
  timeRange: TimeRange;
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function getRevenueAndTarget(scorecards: AccountManagerScorecard[], timeRange: TimeRange) {
  return scorecards.reduce(
    (acc, sc) => {
      const metric = sc[timeRange].valueOfRevenueCents;
      if (timeRange === "weekly") {
        return {
          actual: acc.actual + metric,
          target: acc.target + sc.targets.valueOfRevenueWeeklyCents,
        };
      }
      if (timeRange === "quarterly") {
        return {
          actual: acc.actual + metric,
          target: acc.target + sc.targets.valueOfRevenueQuarterlyCents,
        };
      }
      return {
        actual: acc.actual + metric,
        target: acc.target + sc.targets.valueOfRevenueAnnuallyCents,
      };
    },
    { actual: 0, target: 0 },
  );
}

function daysBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.floor((e - s) / (24 * 60 * 60 * 1000));
  return diff + 1;
}

function getProgress(timeRange: TimeRange): { elapsedUnits: number; totalUnits: number } {
  if (timeRange === "weekly") {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    return { elapsedUnits: dayOfWeek, totalUnits: 7 };
  }

  const today = new Date();

  if (timeRange === "quarterly") {
    const start = getCurrentQuarterStart();
    const end = getCurrentQuarterEnd();
    const totalDays = daysBetween(start, end);
    const elapsedDays = daysBetween(start, today.toISOString().substring(0, 10));
    return { elapsedUnits: Math.min(elapsedDays, totalDays), totalUnits: totalDays };
  }

  const yearStart = getCurrentYearStart();
  const yearEnd = getCurrentYearEnd();
  const totalDays = daysBetween(yearStart, yearEnd);
  const elapsedDays = daysBetween(yearStart, today.toISOString().substring(0, 10));
  return { elapsedUnits: Math.min(elapsedDays, totalDays), totalUnits: totalDays };
}

export function PaceForecastCard({ scorecards, timeRange }: PaceForecastCardProps) {
  const { actual, target } = getRevenueAndTarget(scorecards, timeRange);
  const { elapsedUnits, totalUnits } = getProgress(timeRange);

  const expectedToDate = totalUnits > 0 ? Math.round((target * elapsedUnits) / totalUnits) : 0;
  const paceGap = actual - expectedToDate;
  const projectedPeriodEnd = elapsedUnits > 0 ? Math.round((actual / elapsedUnits) * totalUnits) : 0;
  const onTrack = projectedPeriodEnd >= target;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Pace and Forecast</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Actual to Date</p>
          <p className="text-lg font-semibold text-gray-900">{formatMoney(actual)}</p>
        </div>
        <div>
          <p className="text-gray-500">Expected to Date</p>
          <p className="text-lg font-semibold text-gray-900">{formatMoney(expectedToDate)}</p>
        </div>
        <div>
          <p className="text-gray-500">Pace Gap</p>
          <p className={`text-lg font-semibold ${paceGap >= 0 ? "text-green-600" : "text-red-600"}`}>
            {paceGap >= 0 ? "+" : ""}
            {formatMoney(paceGap)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Projected Finish</p>
          <p className="text-lg font-semibold text-gray-900">{formatMoney(projectedPeriodEnd)}</p>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 font-medium ${
            onTrack ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {onTrack ? "On track for target" : "Behind target pace"}
        </span>
      </div>
    </div>
  );
}
