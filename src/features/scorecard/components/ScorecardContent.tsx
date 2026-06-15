"use client";

import { useState } from "react";
import { CompactDetailedStatWithGraph } from "./CompactDetailedStatWithGraph";
import { CompactDetailedStatWithSpeedometer } from "./CompactDetailedStatWithSpeedometer";
import { ScorecardHeader } from "./ScorecardHeader";
import { AccountManagerCard } from "./AccountManagerCard";
import { PAGE_NAME } from "../constants/nav";
import { useDriverPayData } from "../hooks/overview/useDriverPayData";
import { useAccountManagers } from "@/features/manageTeam/hooks/useAccountManagers";
import { useNumberOfQuotesSentData } from "../hooks/overview/useNumberOfQuotesSentData";
import { useNumberOfQuotesSignedData } from "../hooks/overview/useNumberOfQuotesSignedData";
import { useValueOfQuotesSentData } from "../hooks/overview/useValueOfQuotesSentData";
import { useValueOfQuotesSignedData } from "../hooks/overview/useValueOfQuotesSignedData";
import { useRevenueData } from "../hooks/overview/useRevenueData";
import { useGrossMarginData } from "../hooks/overview/useGrossMarginData";
import { useTimezoneStore, TIMEZONE_OPTIONS } from "@/lib/useTimezoneStore";
import { useScorecardStatsContext } from "../hooks/ScorecardStatsContext";
import { buildScorecardTemplateUrl } from "@/features/quotesAndBookings/utils/scorecardTemplates";
import { buildWorkTrackerTemplateUrl } from "@/features/allWorkTrackers/utils/workTrackerTemplates";
import { GrossMarginBreakdownModal } from "./GrossMarginBreakdownModal";

export function ScorecardContent() {
  const quotesSentData = useNumberOfQuotesSentData();
  const valueOfQuotesSentData = useValueOfQuotesSentData();
  const quotesSignedData = useNumberOfQuotesSignedData();
  const valueOfQuotesSignedData = useValueOfQuotesSignedData();
  const revenueData = useRevenueData();
  const grossMarginData = useGrossMarginData();
  const driverPayData = useDriverPayData();
  const accountManagers = useAccountManagers(false);
  const { activeRange, periodStart } = useScorecardStatsContext();
  const timezone = useTimezoneStore((s) => s.timezone);
  const timezoneLabel = TIMEZONE_OPTIONS.find((o) => o.value === timezone)?.label ?? timezone;
  const [grossMarginModalOpen, setGrossMarginModalOpen] = useState(false);

  const periodLabel =
    activeRange === "quarterly" ? "this quarter" : activeRange === "annually" ? "this year" : "this week";

  return (
    <div className="p-4">
      <ScorecardHeader />
      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-800">
        Stats are shown in <span className="font-semibold">{timezoneLabel}</span> time. Change the
        timezone on the{" "}
        <a href="/quotes-bookings" className="underline font-medium hover:text-blue-900">
          Quotes &amp; Bookings
        </a>{" "}
        page.
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Number of Quotes Sent"
          statType="number-of-quotes-sent"
          historyHref={`/${PAGE_NAME}/history/quotes-sent`}
          seeDataHref={buildScorecardTemplateUrl("quotes-sent", activeRange, null, periodStart)}
          thisPeriod={quotesSentData.thisPeriod}
          lastPeriod={quotesSentData.lastPeriod}
          chartData={quotesSentData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Sent"
          statType="value-of-quotes-sent"
          seeDataHref={buildScorecardTemplateUrl("value-of-quotes-sent", activeRange, null, periodStart)}
          unit="money"
          thisPeriod={valueOfQuotesSentData.thisPeriod}
          lastPeriod={valueOfQuotesSentData.lastPeriod}
          chartData={valueOfQuotesSentData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Number of Quotes Signed"
          statType="number-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/quotes-signed`}
          seeDataHref={buildScorecardTemplateUrl("quotes-signed", activeRange, null, periodStart)}
          thisPeriod={quotesSignedData.thisPeriod}
          lastPeriod={quotesSignedData.lastPeriod}
          chartData={quotesSignedData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Signed"
          statType="value-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/value-of-quotes-signed`}
          seeDataHref={buildScorecardTemplateUrl("value-of-quotes-signed", activeRange, null, periodStart)}
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
          seeDataHref={buildScorecardTemplateUrl("revenue", activeRange, null, periodStart)}
          thisPeriod={revenueData.thisPeriod}
          lastPeriod={revenueData.lastPeriod}
          chartData={revenueData.chartData}
        />
        <CompactDetailedStatWithSpeedometer
          label="Gross Margin"
          statType="gross-margin"
          historyHref={`/${PAGE_NAME}/history/gross-margin`}
          onSeeDataClick={() => setGrossMarginModalOpen(true)}
          unit="percentage"
          thisPeriod={grossMarginData.thisPeriod}
          lastPeriod={grossMarginData.lastPeriod}
        />
        <CompactDetailedStatWithGraph
          label="Driver Pay"
          unit="money"
          seeDataHref={buildWorkTrackerTemplateUrl("driver-pay", activeRange, null, periodStart)}
          thisPeriod={driverPayData.thisPeriod}
          lastPeriod={driverPayData.lastPeriod}
          chartData={driverPayData.chartData}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accountManagers.map((am) => (
          <AccountManagerCard key={am.accountManagerUuid} accountManager={am} />
        ))}
      </div>

      <GrossMarginBreakdownModal
        open={grossMarginModalOpen}
        onOpenChange={setGrossMarginModalOpen}
        revenueDollars={grossMarginData.thisPeriod.revenueDollars}
        driverPayDollars={grossMarginData.thisPeriod.driverPayDollars}
        grossMargin={grossMarginData.thisPeriod.current}
        periodLabel={periodLabel}
      />
    </div>
  );
}
