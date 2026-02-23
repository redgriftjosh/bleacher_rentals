"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAccountManager } from "@/features/scorecard-two/hooks/accountManager/useAccountManager";
// import { useRevenue } from "@/features/scorecard-two/hooks/overview/useRevenue";
import { CompactDetailedStatWithGraph } from "@/features/scorecard-two/components/CompactDetailedStatWithGraph";
import { PAGE_NAME } from "@/features/scorecard-two/constants/nav";
import { useEventData } from "@/features/scorecard-two/hooks/overview/useEventData";
import TimeRangeToggle from "@/features/scorecard-two/components/TimeRangeToggle";

export default function AccountManagerDetailPage() {
  const params = useParams<{ accountManagerUuid: string }>();
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const accountManager = useAccountManager(params.accountManagerUuid);
  const quotesSentData = useEventData({
    onlyBooked: false,
    useValue: false,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: params.accountManagerUuid,
    dateField: "created_at",
    targetType: "quotes",
  });
  const quotesSignedData = useEventData({
    onlyBooked: true,
    useValue: false,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: params.accountManagerUuid,
    dateField: "created_at",
    targetType: "sales",
  });
  const valueOfQuotesSignedData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: params.accountManagerUuid,
    dateField: "created_at",
    targetType: "value_of_sales",
  });
  const revenueData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: params.accountManagerUuid,
    dateField: "event_start",
    targetType: "value_of_revenue",
  });

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
              href={`/${PAGE_NAME}?timeRange=${timeRangeParam ?? "weekly"}`}
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
          <TimeRangeToggle />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Number of Quotes Sent"
          accountManagerUuid={params.accountManagerUuid}
          statType="number-of-quotes-sent"
          historyHref={`/${PAGE_NAME}/history/quotes-sent`}
          thisPeriod={quotesSentData.thisPeriod}
          lastPeriod={quotesSentData.lastPeriod}
          chartData={quotesSentData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Number of Quotes Signed"
          accountManagerUuid={params.accountManagerUuid}
          statType="number-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/quotes-signed`}
          thisPeriod={quotesSignedData.thisPeriod}
          lastPeriod={quotesSignedData.lastPeriod}
          chartData={quotesSignedData.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Signed"
          accountManagerUuid={params.accountManagerUuid}
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
          accountManagerUuid={params.accountManagerUuid}
          statType="revenue"
          historyHref={`/${PAGE_NAME}/history/revenue`}
          thisPeriod={revenueData.thisPeriod}
          lastPeriod={revenueData.lastPeriod}
          chartData={revenueData.chartData}
        />
      </div>
    </div>
  );
}
