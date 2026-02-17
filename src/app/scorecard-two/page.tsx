"use client";
import { CompactDetailedStatWithGraph } from "@/features/scorecard-two/components/CompactDetailedStatWithGraph";
import { ScorecardHeader } from "@/features/scorecard-two/components/ScorecardHeader";
import { useQuotesSent } from "@/features/scorecard-two/hooks/overview/useQuotesSent";

const sampleChartData = [
  { day: "M", dayLabel: "Monday", thisWeek: 3, lastWeek: 2, pace: 4 },
  { day: "T", dayLabel: "Tuesday", thisWeek: 7, lastWeek: 5, pace: 8 },
  { day: "W", dayLabel: "Wednesday", thisWeek: 12, lastWeek: 9, pace: 12 },
  { day: "Th", dayLabel: "Thursday", thisWeek: 16, lastWeek: 14, pace: 16 },
  { day: "F", dayLabel: "Friday", thisWeek: null, lastWeek: 18, pace: 20 },
  { day: "Sa", dayLabel: "Saturday", thisWeek: null, lastWeek: 18, pace: 20 },
  { day: "Su", dayLabel: "Sunday", thisWeek: null, lastWeek: 20, pace: 20 },
];

export default function ScorecardPage() {
  const quotesSentData = useQuotesSent();

  return (
    <div className="p-4">
      <ScorecardHeader />
      <CompactDetailedStatWithGraph
        label="Number of Quotes Sent"
        statType="number-of-quotes-sent"
        historyHref="/scorecard-two/history/quotes-sent"
        thisWeek={quotesSentData.thisWeek}
        lastWeek={quotesSentData.lastWeek}
        chartData={quotesSentData.chartData}
      />
    </div>
  );
}
