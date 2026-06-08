"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompactStatWithRing } from "./CompactStatWithRing";
import { AccountManagerOption } from "@/features/manageTeam/hooks/useAccountManagers";
import { PAGE_NAME } from "../constants/nav";
import { useAccountManagerScorecard } from "../hooks/accountManager/useAccountManagerScorecard";

type AccountManagerCardProps = {
  accountManager: AccountManagerOption;
};

export function AccountManagerCard({ accountManager }: AccountManagerCardProps) {
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const manager = accountManager;

  const data = useAccountManagerScorecard(
    manager.accountManagerUuid,
    manager.userUuid,
  );

  const href = `/${PAGE_NAME}/account-manager/${manager.accountManagerUuid}?timeRange=${timeRangeParam ?? "weekly"}`;

  const stats = [
    {
      title: "Quotes Sent",
      value: data.quotesSent.thisPeriod.current,
      paceTarget: data.quotesSent.thisPeriod.paceTarget,
      goal: data.quotesSent.thisPeriod.goal,
    },
    {
      title: "Quotes Signed",
      value: data.quotesSigned.thisPeriod.current,
      paceTarget: data.quotesSigned.thisPeriod.paceTarget,
      goal: data.quotesSigned.thisPeriod.goal,
    },
    {
      title: "Value Signed",
      value: data.valueOfQuotesSigned.thisPeriod.current,
      paceTarget: data.valueOfQuotesSigned.thisPeriod.paceTarget,
      goal: data.valueOfQuotesSigned.thisPeriod.goal,
      isMoney: true,
    },
    {
      title: "Revenue",
      value: data.revenue.thisPeriod.current,
      paceTarget: data.revenue.thisPeriod.paceTarget,
      goal: data.revenue.thisPeriod.goal,
      isMoney: true,
    },
    {
      title: "Driver Pay",
      value: data.driverPay.thisPeriod.current,
      paceTarget: 0,
      goal: 0,
      isMoney: true,
    },
    {
      title: "Gross Margin",
      value: data.grossMargin.thisPeriod.current,
      paceTarget: data.grossMargin.thisPeriod.goal, // gross margin pace = goal (it's a %)
      goal: data.grossMargin.thisPeriod.goal,
      isPercentage: true,
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

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <CompactStatWithRing
            key={stat.title}
            title={stat.title}
            value={stat.value}
            paceTarget={stat.paceTarget}
            goal={stat.goal}
            isMoney={stat.isMoney}
            isPercentage={stat.isPercentage}
          />
        ))}
      </div>
    </Link>
  );
}
