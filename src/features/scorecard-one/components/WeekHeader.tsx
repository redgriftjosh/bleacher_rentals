import { WeekData } from "../db";
import { StatusValueCard } from "./StatusValueCard";
import { WeekWinnerCard } from "./WeekWinnerCard";

type WeekMetrics = {
  totalQuotes: number;
  totalBooked: number;
  totalLost: number;
  totalQuotedValue: number;
  totalSignedValue: number;
  totalLostValue: number;
  totalCount?: number;
  totalValue?: number;
};

type WeekHeaderProps = {
  week: WeekData;
  metrics: WeekMetrics;
};

export function WeekHeader({ week, metrics }: WeekHeaderProps) {
  const totalValue = metrics.totalQuotedValue + metrics.totalSignedValue + metrics.totalLostValue;

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div className="flex bg-gray-300 items-center justify-between w-full pr-4 py-2 border-b border-x border-gray-400">
      <div className="flex items-center gap-6">
        <div className="flex flex-col pl-2">
          <h3 className="text-lg text-gray-700 font-semibold -mb-1 -mt-1">{week.weekLabel}</h3>
          <span className="text-sm text-gray-600 -mb-1">
            {week.events.length} Quotes • {formatCurrency(totalValue)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <StatusValueCard
            status="PENDING"
            count={metrics.totalQuotes}
            value={metrics.totalQuotedValue}
          />
          <StatusValueCard
            status="SIGNED"
            count={metrics.totalBooked}
            value={metrics.totalSignedValue}
          />
          <StatusValueCard status="LOST" count={metrics.totalLost} value={metrics.totalLostValue} />
        </div>
      </div>
      <WeekWinnerCard events={week.events} />
    </div>
  );
}
