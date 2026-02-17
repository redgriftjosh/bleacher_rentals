"use client";

type MetricProgressBarProps = {
  label: string;
  current: number;
  target: number;
  isMoney?: boolean;
};

function formatValue(value: number, isMoney: boolean): string {
  if (isMoney) {
    const dollars = value / 100;
    if (dollars >= 1000000) return `$${(dollars / 1000000).toFixed(1)}M`;
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(0)}k`;
    return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return value.toString();
}

export function MetricProgressBar({ label, current, target, isMoney = false }: MetricProgressBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const overTarget = target > 0 && current > target;

  // Color based on percentage
  let barColor = "bg-red-500";
  if (pct >= 75) barColor = "bg-green-500";
  else if (pct >= 50) barColor = "bg-yellow-500";
  else if (pct >= 25) barColor = "bg-orange-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${overTarget ? "text-green-600" : "text-gray-900"}`}>
          {formatValue(current, isMoney)}{" "}
          <span className="text-gray-400 font-normal">/ {formatValue(target, isMoney)}</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 text-right">{pct.toFixed(0)}%</div>
    </div>
  );
}
