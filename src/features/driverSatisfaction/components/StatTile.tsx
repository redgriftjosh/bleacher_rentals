"use client";

import { ReactNode } from "react";

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  /** Colour the number when it carries a verdict rather than just a count. */
  tone?: "neutral" | "good" | "bad";
};

const TONE_CLASS: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "text-darkBlue",
  good: "text-green-600",
  bad: "text-red-600",
};

export default function StatTile({ label, value, hint, icon, tone = "neutral" }: StatTileProps) {
  return (
    <div className="flex-1 min-w-[180px] bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        {icon ? <div className="text-darkBlue">{icon}</div> : null}
      </div>
      <div className={`text-2xl font-bold ${TONE_CLASS[tone]}`}>{value}</div>
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  );
}
