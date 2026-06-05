"use client";

import { CompactDetailedStatWithGraph } from "./CompactDetailedStatWithGraph";
import { CompactDetailedStatWithSpeedometer } from "./CompactDetailedStatWithSpeedometer";
import { ScorecardHeader } from "./ScorecardHeader";
// import { AccountManagerCard } from "./AccountManagerCard";
import { PAGE_NAME } from "../constants/nav";
import { useDriverPayData } from "../hooks/overview/useDriverPayData";
// import { useAccountManagers } from "../hooks/accountManager/useAccountManagers";
import { useNumberOfQuotesSentData } from "../hooks/overview/useNumberOfQuotesSentData";
import { useNumberOfQuotesSignedData } from "../hooks/overview/useNumberOfQuotesSignedData";
import { useValueOfQuotesSignedData } from "../hooks/overview/useValueOfQuotesSignedData";
import { useRevenueData } from "../hooks/overview/useRevenueData";
import { useGrossMarginData } from "../hooks/overview/useGrossMarginData";

export function ScorecardContent() {
  const quotesSentData = useNumberOfQuotesSentData();
  const quotesSignedData = useNumberOfQuotesSignedData();
  const valueOfQuotesSignedData = useValueOfQuotesSignedData();
  const revenueData = useRevenueData();
  const grossMarginData = useGrossMarginData();
  const driverPayData = useDriverPayData();
  // const accountManagers = useAccountManagers();

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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
        <CompactDetailedStatWithGraph
          label="Driver Pay"
          unit="money"
          thisPeriod={driverPayData.thisPeriod}
          lastPeriod={driverPayData.lastPeriod}
          chartData={driverPayData.chartData}
        />
      </div>
      {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountManagers.map((am) => (
          <AccountManagerCard key={am.accountManagerUuid} accountManager={am} />
        ))}
      </div> */}
    </div>
  );
}
