"use client";
import { useAccountManagers } from "@/features/manageTeam/hooks/useAccountManagers";
import { AccountManagerCard } from "@/features/scorecard-two/components/AccountManagerCard";
import { CompactDetailedStatWithGraph } from "@/features/scorecard-two/components/CompactDetailedStatWithGraph";
import { ScorecardHeader } from "@/features/scorecard-two/components/ScorecardHeader";
import { TempCompactDetailedStatWithGraph } from "@/features/scorecard-two/components/TempQuarterlyComponent";
import { PAGE_NAME } from "@/features/scorecard-two/constants/nav";
import { useEventData } from "@/features/scorecard-two/hooks/overview/useEventData";
function buildQuarterlySampleData() {
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 2, 31);

  const chartData: {
    day: string;
    dayLabel: string;
    thisPeriod: number;
    lastPeriod: number;
    pace: number;
  }[] = [];

  let thisPeriodCumulative = 0;
  let lastPeriodCumulative = 0;
  const goal = 600000;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + dayIndex);

    const weekday = currentDate.getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    const monthlyLift = currentDate.getMonth() * 520;
    const weeklyWaveThis = Math.sin((dayIndex / 6) * Math.PI) * 1400;
    const weeklyWaveLast = Math.cos((dayIndex / 7) * Math.PI) * 1100;
    const momentum = dayIndex * 24;

    let thisDailyBase =
      (isWeekend ? 1800 : 6000) +
      monthlyLift +
      weeklyWaveThis +
      momentum +
      ((dayIndex * 173) % 1200);
    let lastDailyBase =
      (isWeekend ? 1600 : 5400) +
      monthlyLift * 0.9 +
      weeklyWaveLast +
      momentum * 0.78 +
      ((dayIndex * 139) % 1100);

    const isBigWinThis = dayIndex % 13 === 0 || dayIndex % 29 === 0;
    const isSlumpThis = dayIndex % 11 === 0;
    const isBigWinLast = dayIndex % 17 === 0 || dayIndex % 31 === 0;
    const isSlumpLast = dayIndex % 9 === 0;

    if (isBigWinThis) {
      thisDailyBase += 9000 + ((dayIndex * 41) % 3200);
    }
    if (isSlumpThis) {
      thisDailyBase -= 3800 + ((dayIndex * 29) % 1400);
    }
    if (isBigWinLast) {
      lastDailyBase += 7000 + ((dayIndex * 37) % 2600);
    }
    if (isSlumpLast) {
      lastDailyBase -= 3200 + ((dayIndex * 23) % 1300);
    }

    const thisDaily = Math.max(500, Math.round(thisDailyBase));
    const lastDaily = Math.max(500, Math.round(lastDailyBase));

    thisPeriodCumulative += thisDaily;
    lastPeriodCumulative += lastDaily;

    const paceForDay = Math.round((goal / totalDays) * (dayIndex + 1));

    chartData.push({
      day: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
      dayLabel: currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      }),
      thisPeriod: Math.round(thisPeriodCumulative),
      lastPeriod: Math.round(lastPeriodCumulative),
      pace: paceForDay,
    });
  }

  const lastPoint = chartData[chartData.length - 1];

  return {
    chartData,
    thisPeriod: {
      current: lastPoint.thisPeriod,
      goal,
      paceTarget: lastPoint.pace,
    },
    lastPeriod: {
      currentAtSameDay: lastPoint.lastPeriod,
      totalAtEnd: lastPoint.lastPeriod,
    },
  };
}

const sampleQuarterly = buildQuarterlySampleData();

export default function ScorecardPage() {
  const quotesSentData = useEventData({
    onlyBooked: false,
    useValue: false,
    createdByUserUuid: null,
    dateField: "created_at",
  });
  const quotesSignedData = useEventData({
    onlyBooked: true,
    useValue: false,
    createdByUserUuid: null,
    dateField: "created_at",
  });
  const valueOfQuotesSignedData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: null,
    dateField: "created_at",
  });
  const revenueData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: null,
    dateField: "event_start",
  });
  // const revenueData = useRevenue();
  const accountManagers = useAccountManagers();
  console.log("Test");

  return (
    <div className="p-4">
      <ScorecardHeader />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Number of Quotes Sent"
          statType="number-of-quotes-sent"
          historyHref={`/${PAGE_NAME}/history/quotes-sent`}
          thisPeriod={quotesSentData.thisPeriod}
          lastPeriod={quotesSentData.lastPeriod}
          chartData={quotesSentData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Number of Quotes Signed"
          statType="number-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/quotes-signed`}
          thisPeriod={quotesSignedData.thisPeriod}
          lastPeriod={quotesSignedData.lastPeriod}
          chartData={quotesSignedData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Signed"
          statType="value-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/value-of-quotes-signed`}
          unit="money"
          thisPeriod={valueOfQuotesSignedData.thisPeriod}
          lastPeriod={valueOfQuotesSignedData.lastPeriod}
          chartData={valueOfQuotesSignedData.chartData}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Revenue"
          statType="revenue"
          historyHref={`/${PAGE_NAME}/history/revenue`}
          thisPeriod={revenueData.thisPeriod}
          lastPeriod={revenueData.lastPeriod}
          chartData={revenueData.chartData}
        />
        <TempCompactDetailedStatWithGraph
          label="Q1"
          statType="quarter"
          historyHref={`/${PAGE_NAME}/history/quarterly`}
          unit="money"
          thisPeriod={sampleQuarterly.thisPeriod}
          lastPeriod={sampleQuarterly.lastPeriod}
          chartData={sampleQuarterly.chartData}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountManagers.map((am) => (
          <AccountManagerCard key={am.accountManagerUuid} accountManager={am} />
        ))}
      </div>
    </div>
  );
}
