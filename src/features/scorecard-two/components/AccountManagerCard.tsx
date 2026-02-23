"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompactStatWithRing } from "./CompactStatWithRing";
import { AccountManagerOption } from "@/features/manageTeam/hooks/useAccountManagers";
import { useQuotesSent } from "../hooks/overview/useQuotesSent";
// import { useRevenue } from "../hooks/overview/useRevenue";
import { useQuotesSigned } from "../hooks/overview/useQuotesSigned";
import { useValueOfQuotesSigned } from "../hooks/overview/useValueOfQuotesSigned";
import { PAGE_NAME } from "../constants/nav";

type AccountManagerCardProps = {
  accountManager: AccountManagerOption;
};

const PLACEHOLDER_STATS = [
  {
    title: "Quotes Sent",
    value: 42,
    paceDelta: -4,
    progress: 0.62,
  },
  {
    title: "Quotes Signed",
    value: 18,
    paceDelta: -12,
    progress: 0.38,
  },
  {
    title: "Value Signed",
    value: 125000,
    paceDelta: 3,
    progress: 0.74,
    isMoney: true,
  },
  {
    title: "Revenue",
    value: 84000,
    paceDelta: -2,
    progress: 0.55,
    isMoney: true,
  },
];

export function AccountManagerCard({ accountManager }: AccountManagerCardProps) {
  const quotesSent = useQuotesSent(accountManager.userUuid);
  const quotesSigned = useQuotesSigned(accountManager.userUuid);
  const valueOfQuotesSigned = useValueOfQuotesSigned(accountManager.userUuid);
  // const revenue = useRevenue(accountManager.userUuid);
  const manager = accountManager;
  const href = `/${PAGE_NAME}/account-manager/${manager.accountManagerUuid}`;

  const stats = [
    {
      title: "Quotes Sent",
      value: quotesSent.thisPeriod.current,
      paceDelta: quotesSent.thisPeriod.current - quotesSent.lastPeriod.currentAtSameDay,
      progress: quotesSent.thisPeriod.current / quotesSent.thisPeriod.goal,
    },
    {
      title: "Quotes Signed",
      value: quotesSigned.thisPeriod.current,
      paceDelta: quotesSigned.thisPeriod.current - quotesSigned.lastPeriod.currentAtSameDay,
      progress: quotesSigned.thisPeriod.current / quotesSigned.thisPeriod.goal,
    },
    {
      title: "Value Signed",
      value: valueOfQuotesSigned.thisPeriod.current,
      paceDelta:
        valueOfQuotesSigned.thisPeriod.current - valueOfQuotesSigned.lastPeriod.currentAtSameDay,
      progress: valueOfQuotesSigned.thisPeriod.current / valueOfQuotesSigned.thisPeriod.goal,
      isMoney: true,
    },
    // {
    //   title: "Revenue",
    //   value: revenue.thisPeriod.current,
    //   paceDelta: revenue.thisPeriod.current - revenue.lastPeriod.currentAtSameDay,
    //   progress: revenue.thisPeriod.current / revenue.thisPeriod.goal,
    //   isMoney: true,
    // },
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
