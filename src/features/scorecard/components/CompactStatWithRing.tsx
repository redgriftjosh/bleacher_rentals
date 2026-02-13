"use client";

type CompactStatWithRingProps = {
  title: string;
  value: number | string;
  paceDelta: number;
  progress: number;
  isMoney?: boolean;
};

function getTone(paceDelta: number) {
  if (paceDelta <= -10) {
    return {
      text: "text-red-600",
      ring: "#dc2626",
      bg: "#fee2e2",
    };
  }
  if (paceDelta <= -2) {
    return {
      text: "text-amber-600",
      ring: "#f59e0b",
      bg: "#fef3c7",
    };
  }
  return {
    text: "text-emerald-600",
    ring: "#16a34a",
    bg: "#dcfce7",
  };
}

function formatValue(value: number | string, isMoney?: boolean) {
  if (typeof value === "string") return value;
  if (!isMoney) return value.toLocaleString();
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
  paceDelta,
  progress,
  isMoney,
}: CompactStatWithRingProps) {
  const tone = getTone(paceDelta);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const ringStyle = {
    background: `conic-gradient(${tone.ring} ${clampedProgress * 360}deg, ${tone.bg} 0deg)`,
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</div>
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full" style={ringStyle} />
        <div className="absolute inset-2 rounded-full bg-white" />
        <div className="relative flex flex-col items-center">
          <div className={`text-lg font-bold ${tone.text}`}>{formatValue(value, isMoney)}</div>
          <div className={`text-[10px] font-semibold ${tone.text}`}>PACE {paceDelta}</div>
        </div>
      </div>
    </div>
  );
}
