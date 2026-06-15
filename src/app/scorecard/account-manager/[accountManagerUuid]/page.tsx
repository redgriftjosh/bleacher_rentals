"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAccountManager } from "@/features/scorecard/hooks/accountManager/useAccountManager";
import { useAccountManagerScorecard } from "@/features/scorecard/hooks/accountManager/useAccountManagerScorecard";
import { CompactDetailedStatWithGraph } from "@/features/scorecard/components/CompactDetailedStatWithGraph";
import { CompactDetailedStatWithSpeedometer } from "@/features/scorecard/components/CompactDetailedStatWithSpeedometer";
import { GrossMarginBreakdownModal } from "@/features/scorecard/components/GrossMarginBreakdownModal";
import { PAGE_NAME } from "@/features/scorecard/constants/nav";
import { ScorecardStatsProvider, useScorecardStatsContext } from "@/features/scorecard/hooks/ScorecardStatsContext";
import { buildScorecardTemplateUrl } from "@/features/quotesAndBookings/utils/scorecardTemplates";
import { buildWorkTrackerTemplateUrl } from "@/features/allWorkTrackers/utils/workTrackerTemplates";
import TimeRangeToggle from "@/features/scorecard/components/TimeRangeToggle";
import PeriodSelect from "@/features/scorecard/components/PeriodSelect";

function AccountManagerContent() {
  const params = useParams<{ accountManagerUuid: string }>();
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const accountManager = useAccountManager(params.accountManagerUuid);
  const { activeRange, periodStart } = useScorecardStatsContext();
  const [grossMarginModalOpen, setGrossMarginModalOpen] = useState(false);

  const data = useAccountManagerScorecard(
    params.accountManagerUuid,
    accountManager?.userUuid ?? "",
  );

  const periodLabel =
    activeRange === "quarterly" ? "this quarter" : activeRange === "annually" ? "this year" : "this week";

  if (!accountManager) {
    return (
      <div className="p-6">
        <p className="text-gray-500 text-center">Account manager not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link
              href={`/${PAGE_NAME}?timeRange=${timeRangeParam ?? "weekly"}${periodStart ? `&periodStart=${periodStart}` : ""}`}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Scorecard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {accountManager.firstName} {accountManager.lastName}
            </h1>
            <p className="text-gray-500">Account Manager Scorecard</p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelect />
            <TimeRangeToggle />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Number of Quotes Sent"
          accountManagerUuid={params.accountManagerUuid}
          statType="number-of-quotes-sent"
          historyHref={`/${PAGE_NAME}/history/quotes-sent`}
          seeDataHref={buildScorecardTemplateUrl("quotes-sent", activeRange, accountManager.userUuid, periodStart)}
          thisPeriod={data.quotesSent.thisPeriod}
          lastPeriod={data.quotesSent.lastPeriod}
          chartData={data.quotesSent.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Sent"
          accountManagerUuid={params.accountManagerUuid}
          statType="value-of-quotes-sent"
          seeDataHref={buildScorecardTemplateUrl("value-of-quotes-sent", activeRange, accountManager.userUuid, periodStart)}
          unit="money"
          thisPeriod={data.valueOfQuotesSent.thisPeriod}
          lastPeriod={data.valueOfQuotesSent.lastPeriod}
          chartData={data.valueOfQuotesSent.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Number of Quotes Signed"
          accountManagerUuid={params.accountManagerUuid}
          statType="number-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/quotes-signed`}
          seeDataHref={buildScorecardTemplateUrl("quotes-signed", activeRange, accountManager.userUuid, periodStart)}
          thisPeriod={data.quotesSigned.thisPeriod}
          lastPeriod={data.quotesSigned.lastPeriod}
          chartData={data.quotesSigned.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Signed"
          accountManagerUuid={params.accountManagerUuid}
          statType="value-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/value-of-quotes-signed`}
          seeDataHref={buildScorecardTemplateUrl("value-of-quotes-signed", activeRange, accountManager.userUuid, periodStart)}
          unit="money"
          thisPeriod={data.valueOfQuotesSigned.thisPeriod}
          lastPeriod={data.valueOfQuotesSigned.lastPeriod}
          chartData={data.valueOfQuotesSigned.chartData}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Revenue"
          accountManagerUuid={params.accountManagerUuid}
          statType="revenue"
          historyHref={`/${PAGE_NAME}/history/revenue`}
          seeDataHref={buildScorecardTemplateUrl("revenue", activeRange, accountManager.userUuid, periodStart)}
          thisPeriod={data.revenue.thisPeriod}
          lastPeriod={data.revenue.lastPeriod}
          chartData={data.revenue.chartData}
        />
        <CompactDetailedStatWithSpeedometer
          label="Gross Margin"
          accountManagerUuid={params.accountManagerUuid}
          statType="gross-margin"
          historyHref={`/${PAGE_NAME}/history/gross-margin`}
          onSeeDataClick={() => setGrossMarginModalOpen(true)}
          unit="percentage"
          thisPeriod={data.grossMargin.thisPeriod}
          lastPeriod={data.grossMargin.lastPeriod}
        />
        <CompactDetailedStatWithGraph
          label="Driver Pay"
          unit="money"
          seeDataHref={buildWorkTrackerTemplateUrl("driver-pay", activeRange, params.accountManagerUuid, periodStart)}
          thisPeriod={data.driverPay.thisPeriod}
          lastPeriod={data.driverPay.lastPeriod}
          chartData={data.driverPay.chartData}
        />
      </div>

      <GrossMarginBreakdownModal
        open={grossMarginModalOpen}
        onOpenChange={setGrossMarginModalOpen}
        revenueDollars={data.grossMargin.thisPeriod.revenueDollars}
        driverPayDollars={data.grossMargin.thisPeriod.driverPayDollars}
        grossMargin={data.grossMargin.thisPeriod.current}
        periodLabel={periodLabel}
      />
    </div>
  );
}

export default function AccountManagerDetailPage() {
  return (
    <ScorecardStatsProvider>
      <AccountManagerContent />
    </ScorecardStatsProvider>
  );
}
