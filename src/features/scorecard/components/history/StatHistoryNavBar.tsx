"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const STAT_OPTIONS = [
  "Quotes Sent",
  "Quotes Signed",
  "Value of Quotes Signed",
  "Revenue",
  "Utilization",
] as const;

type StatHistoryNavBarProps = {
  activeStat: string;
  onStatChange: (stat: string) => void;
};

export function StatHistoryNavBar({ activeStat, onStatChange }: StatHistoryNavBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/scorecard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scorecard
        </Link>

        <div className="flex flex-wrap items-center gap-4 border-b border-gray-200">
          {STAT_OPTIONS.map((stat) => (
            <button
              key={stat}
              onClick={() => onStatChange(stat)}
              className={`px-1 pb-2 text-sm font-semibold border-b-2 transition-colors ${
                activeStat === stat
                  ? "text-gray-900 border-gray-900"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
