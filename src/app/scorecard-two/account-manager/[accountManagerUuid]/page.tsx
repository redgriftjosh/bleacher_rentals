"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAccountManager } from "@/features/scorecard-two/hooks/accountManager/useAccountManager";
import { useQuotesSent } from "@/features/scorecard-two/hooks/overview/useQuotesSent";
import { useQuotesSigned } from "@/features/scorecard-two/hooks/overview/useQuotesSigned";
import { useValueOfQuotesSigned } from "@/features/scorecard-two/hooks/overview/useValueOfQuotesSigned";
// import { useRevenue } from "@/features/scorecard-two/hooks/overview/useRevenue";
import { CompactDetailedStatWithGraph } from "@/features/scorecard-two/components/CompactDetailedStatWithGraph";
import { PAGE_NAME } from "@/features/scorecard-two/constants/nav";

export default function AccountManagerDetailPage() {
  const params = useParams<{ accountManagerUuid: string }>();
  const accountManager = useAccountManager(params.accountManagerUuid);
  console.log("Account Manager Data:", accountManager);
  const quotesSent = useQuotesSent(accountManager?.userUuid);
  //   console.log("Quotes Sent Data:", quotesSent);
  const quotesSigned = useQuotesSigned(accountManager?.userUuid);
  const valueOfQuotesSigned = useValueOfQuotesSigned(accountManager?.userUuid);
  // const revenue = useRevenue(accountManager?.userUuid);

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
        <Link
          href={`/${PAGE_NAME}`}
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

      <div className="grid grid-cols-3 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          label="Number of Quotes Sent"
          statType="number-of-quotes-sent"
          historyHref={`/${PAGE_NAME}/history/quotes-sent`}
          thisPeriod={quotesSent.thisPeriod}
          lastPeriod={quotesSent.lastPeriod}
          chartData={quotesSent.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Number of Quotes Signed"
          statType="number-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/quotes-signed`}
          thisPeriod={quotesSigned.thisPeriod}
          lastPeriod={quotesSigned.lastPeriod}
          chartData={quotesSigned.chartData}
        />
        <CompactDetailedStatWithGraph
          label="Value of Quotes Signed"
          statType="value-of-quotes-signed"
          historyHref={`/${PAGE_NAME}/history/value-of-quotes-signed`}
          unit="money"
          thisPeriod={valueOfQuotesSigned.thisPeriod}
          lastPeriod={valueOfQuotesSigned.lastPeriod}
          chartData={valueOfQuotesSigned.chartData}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* <CompactDetailedStatWithGraph
          label="Revenue"
          statType="revenue"
          historyHref={`/${PAGE_NAME}/history/revenue`}
          thisPeriod={revenue.thisPeriod}
          lastPeriod={revenue.lastPeriod}
          chartData={revenue.chartData}
        /> */}
      </div>
    </div>
  );
}
