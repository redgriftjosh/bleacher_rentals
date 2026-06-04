"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompactStatWithRing } from "./CompactStatWithRing";
import { AccountManagerOption } from "@/features/manageTeam/hooks/useAccountManagers";
import { PAGE_NAME } from "../constants/nav";
import { SalesAggregateRow } from "../hooks/queries/useSalesScorecardAggregate";
import { ScorecardTarget } from "../hooks/queries/useTargets";

type AccountManagerCardProps = {
  accountManager: AccountManagerOption;
  thisYearAggregate: SalesAggregateRow | undefined;
  lastYearAggregate: SalesAggregateRow | undefined;
  target: ScorecardTarget | undefined;
};

export function AccountManagerCard({
  accountManager,
  thisYearAggregate,
  lastYearAggregate,
  target,
}: AccountManagerCardProps) {
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const manager = accountManager;
  const href = `/${PAGE_NAME}/account-manager/${manager.accountManagerUuid}?timeRange=${timeRangeParam ?? "weekly"}`;

  const thisQuotes = thisYearAggregate?.quotes_sent_count ?? 0;
  const lastQuotes = lastYearAggregate?.quotes_sent_count ?? 0;
  const thisSales = thisYearAggregate?.sales_count ?? 0;
  const lastSales = lastYearAggregate?.sales_count ?? 0;
  const thisValueCents = thisYearAggregate?.value_of_sales_cents ?? 0;
  const lastValueCents = lastYearAggregate?.value_of_sales_cents ?? 0;
  const thisRevenueCents = thisYearAggregate?.revenue_cents ?? 0;
  const lastRevenueCents = lastYearAggregate?.revenue_cents ?? 0;

  const thisValue = thisValueCents / 100;
  const lastValue = lastValueCents / 100;
  const thisRevenue = thisRevenueCents / 100;
  const lastRevenue = lastRevenueCents / 100;

  const quotesGoal = target?.quotes_annually ?? 0;
  const salesGoal = target?.sales_annually ?? 0;
  const valueGoal = (target?.value_of_sales_annually_cents ?? 0) / 100;
  const revenueGoal = (target?.value_of_revenue_annually_cents ?? 0) / 100;

  const stats = [
    {
      title: "Quotes Sent",
      value: thisQuotes,
      paceDelta: thisQuotes - lastQuotes,
      progress: quotesGoal > 0 ? thisQuotes / quotesGoal : 0,
    },
    {
      title: "Quotes Signed",
      value: thisSales,
      paceDelta: thisSales - lastSales,
      progress: salesGoal > 0 ? thisSales / salesGoal : 0,
    },
    {
      title: "Value Signed",
      value: thisValue,
      paceDelta: thisValue - lastValue,
      progress: valueGoal > 0 ? thisValue / valueGoal : 0,
      isMoney: true,
    },
    {
      title: "Revenue",
      value: thisRevenue,
      paceDelta: thisRevenue - lastRevenue,
      progress: revenueGoal > 0 ? thisRevenue / revenueGoal : 0,
      isMoney: true,
    },
  ];

  return (
    <Link
      href={href}
      className="block bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={undefined} />
          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
            {manager.firstName?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-gray-900">
            {manager.firstName} {manager.lastName}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <CompactStatWithRing
            key={stat.title}
            title={stat.title}
            value={stat.value}
            paceDelta={stat.paceDelta}
            progress={stat.progress}
            isMoney={stat.isMoney}
          />
        ))}
      </div>
    </Link>
  );
}
