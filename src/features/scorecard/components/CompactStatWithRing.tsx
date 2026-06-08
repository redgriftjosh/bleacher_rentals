"use client";

import { getPaceStatus, PACE_TEXT_COLOR, PACE_HEX, PACE_RING_BG } from "../util/paceStatus";

type CompactStatWithRingProps = {
  title: string;
  /** The current actual value (big number). */
  value: number | string;
  /** Where they should be at right now (pace target). */
  paceTarget: number;
  /** End-of-period goal — used for the ring progress. */
  goal: number;
  isMoney?: boolean;
  isPercentage?: boolean;
};

function formatValue(value: number | string, isMoney?: boolean, isPercentage?: boolean) {
  if (typeof value === "string") return value;
  if (isPercentage) return `${Math.round(value)}%`;
  if (!isMoney) return Math.round(value).toLocaleString();
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    const shortValue = Math.round((value / 1_000_000) * 10) / 10;
    return `$${shortValue}M`;
  }
  if (absValue >= 1_000) {
    const shortValue = Math.round((value / 1_000) * 10) / 10;
    return `$${shortValue}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CompactStatWithRing({
  title,
  value,
  paceTarget,
  goal,
  isMoney,
  isPercentage,
}: CompactStatWithRingProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const status = getPaceStatus(numericValue, paceTarget);
  const textColor = PACE_TEXT_COLOR[status];
  const ringColor = PACE_HEX[status];
  const ringBg = PACE_RING_BG[status];

  const progress = goal > 0 ? Math.min(1, Math.max(0, numericValue / goal)) : 0;
  const ringStyle = {
    background: `conic-gradient(${ringColor} ${progress * 360}deg, ${ringBg} 0deg)`,
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{title}</div>
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full" style={ringStyle} />
        <div className="absolute inset-2 rounded-full bg-white" />
        <div className="relative flex flex-col items-center">
          <div className={`text-lg font-bold ${textColor}`}>
            {formatValue(value, isMoney, isPercentage)}
          </div>
          <div className={`text-[10px] font-semibold ${textColor}`}>
            PACE {formatValue(paceTarget, isMoney, isPercentage)}
          </div>
        </div>
      </div>
    </div>
  );
}
