"use client";

import ReactSpeedometer from "react-d3-speedometer";

type RevenueSpeedometerProps = {
  currentRevenue: number; // in dollars
  maxRevenue: number; // in dollars
};

export function RevenueSpeedometer({ currentRevenue, maxRevenue }: RevenueSpeedometerProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <ReactSpeedometer
        value={currentRevenue}
        minValue={0}
        maxValue={maxRevenue}
        needleColor="#374151"
        startColor="#ef4444"
        segments={3}
        endColor="#22c55e"
        width={400}
        height={250}
        ringWidth={40}
        needleTransitionDuration={1000}
        currentValueText={formatCurrency(currentRevenue)}
        customSegmentStops={[0, maxRevenue * 0.33, maxRevenue * 0.66, maxRevenue]}
        segmentColors={["#ef4444", "#facc15", "#22c55e"]}
        textColor="#374151"
      />

      <div className="text-sm text-gray-500 mt-2">Year-to-Date Revenue</div>
    </div>
  );
}
