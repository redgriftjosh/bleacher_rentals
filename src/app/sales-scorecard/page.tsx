"use client";

import { useMemo } from "react";
import { AccountManagerCard } from "@/features/salesScorecard/components/AccountManagerCard";
import { CompactDetailedStatWithGraph } from "@/features/salesScorecard/components/CompactDetailedStatWithGraph";
import { ScorecardHeader } from "@/features/salesScorecard/components/ScorecardHeader";
import { PAGE_NAME } from "@/features/salesScorecard/constants/nav";
import { useAccountManagers } from "@/features/salesScorecard/hooks/accountManager/useAccountManagers";
import { useEventData } from "@/features/salesScorecard/hooks/overview/useEventData";
import { useGrossMarginData } from "@/features/salesScorecard/hooks/overview/useGrossMarginData";
import { CompactDetailedStatWithSpeedometer } from "@/features/salesScorecard/components/CompactDetailedStatWithSpeedometer";
import { useSalesScorecardAggregate } from "@/features/salesScorecard/hooks/queries/useSalesScorecardAggregate";
import { useTargets } from "@/features/salesScorecard/hooks/queries/useTargets";

export default function ScorecardPage() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const quotesSentData = useEventData({
    onlyBooked: false,
    useValue: false,
    createdByUserUuid: null,
    accountManagerUuid: null,
    dateField: "created_at",
    targetType: "quotes",
  });
  const quotesSignedData = useEventData({
    onlyBooked: true,
    useValue: false,
    createdByUserUuid: null,
    accountManagerUuid: null,
    dateField: "booked_at",
    targetType: "sales",
  });
  const valueOfQuotesSignedData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: null,
    accountManagerUuid: null,
    dateField: "booked_at",
    targetType: "value_of_sales",
  });
  const revenueData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: null,
    accountManagerUuid: null,
    dateField: "event_start",
    targetType: "value_of_revenue",
  });
  const grossMarginData = useGrossMarginData({
    createdByUserUuid: null,
    accountManagerUuid: null,
  });

  const accountManagers = useAccountManagers();
  const thisYearRows = useSalesScorecardAggregate(currentYear);
  const lastYearRows = useSalesScorecardAggregate(currentYear - 1);
  const { targets } = useTargets("annually", "quotes", null);

  const thisYearByAm = useMemo(
    () => new Map(thisYearRows.map((r) => [r.account_manager_uuid, r])),
    [thisYearRows],
  );
  const lastYearByAm = useMemo(
    () => new Map(lastYearRows.map((r) => [r.account_manager_uuid, r])),
    [lastYearRows],
  );
  const targetByAm = useMemo(
    () => new Map(targets.map((t) => [t.account_manager_uuid, t])),
    [targets],
  );

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
        <CompactDetailedStatWithSpeedometer
          label="Gross Margin"
          statType="gross-margin"
          historyHref={`/${PAGE_NAME}/history/gross-margin`}
          unit="percentage"
          thisPeriod={grossMarginData.thisPeriod}
          lastPeriod={grossMarginData.lastPeriod}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountManagers.map((am) => (
          <AccountManagerCard
            key={am.accountManagerUuid}
            accountManager={am}
            thisYearAggregate={thisYearByAm.get(am.accountManagerUuid)}
            lastYearAggregate={lastYearByAm.get(am.accountManagerUuid)}
            target={targetByAm.get(am.accountManagerUuid)}
          />
        ))}
      </div>
    </div>
  );
}
