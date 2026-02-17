"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useScorecardData } from "@/features/scorecard-one/hooks/useScorecardData";
import { CompactDetailedStatWithGraph } from "@/features/scorecard-one/components/CompactDetailedStatWithGraph";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AccountManagerDetailPage() {
  const params = useParams<{ accountManagerUuid: string }>();
  const { scorecards, isLoading } = useScorecardData();

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const scorecard = scorecards.find((sc) => sc.manager.userUuid === params.accountManagerUuid);

  if (!scorecard) {
    return (
      <div className="p-6">
        <p className="text-gray-500 text-center">Account manager not found.</p>
      </div>
    );
  }

  const { manager } = scorecard;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/scorecard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scorecard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {manager.firstName} {manager.lastName}
        </h1>
        <p className="text-gray-500">Account Manager Scorecard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          statType="number-of-quotes-sent"
          accountManagerUuid={params.accountManagerUuid}
        />
        <CompactDetailedStatWithGraph
          statType="number-of-quotes-signed"
          accountManagerUuid={params.accountManagerUuid}
        />
        <CompactDetailedStatWithGraph
          statType="value-of-quotes-signed"
          accountManagerUuid={params.accountManagerUuid}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 mb-6">
        <CompactDetailedStatWithGraph
          statType="revenue"
          accountManagerUuid={params.accountManagerUuid}
        />
        <CompactDetailedStatWithGraph
          statType="bleacher-utilization"
          accountManagerUuid={params.accountManagerUuid}
        />
      </div>
    </div>
  );
}
