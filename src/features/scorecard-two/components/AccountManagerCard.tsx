"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompactStatWithRing } from "./CompactStatWithRing";
import { AccountManagerOption } from "@/features/manageTeam/hooks/useAccountManagers";
import { PAGE_NAME } from "../constants/nav";
import { useEventData } from "../hooks/overview/useEventData";

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
  const quotesSentData = useEventData({
    onlyBooked: false,
    useValue: false,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: accountManager.accountManagerUuid,
    dateField: "created_at",
    targetType: "quotes",
  });
  const quotesSignedData = useEventData({
    onlyBooked: true,
    useValue: false,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: accountManager.accountManagerUuid,
    dateField: "created_at",
    targetType: "sales",
  });
  const valueOfQuotesSignedData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: accountManager.accountManagerUuid,
    dateField: "created_at",
    targetType: "value_of_sales",
  });
  const revenueData = useEventData({
    onlyBooked: true,
    useValue: true,
    createdByUserUuid: accountManager?.userUuid || null,
    accountManagerUuid: accountManager.accountManagerUuid,
    dateField: "event_start",
    targetType: "value_of_revenue",
  });
  const manager = accountManager;
  const href = `/${PAGE_NAME}/account-manager/${manager.accountManagerUuid}`;

  const stats = [
    {
      title: "Quotes Sent",
      value: quotesSentData.thisPeriod.current,
      paceDelta: quotesSentData.thisPeriod.current - quotesSentData.lastPeriod.currentAtSameDay,
      progress: quotesSentData.thisPeriod.current / quotesSentData.thisPeriod.goal,
    },
    {
      title: "Quotes Signed",
      value: quotesSignedData.thisPeriod.current,
      paceDelta: quotesSignedData.thisPeriod.current - quotesSignedData.lastPeriod.currentAtSameDay,
      progress: quotesSignedData.thisPeriod.current / quotesSignedData.thisPeriod.goal,
    },
    {
      title: "Value Signed",
      value: valueOfQuotesSignedData.thisPeriod.current,
      paceDelta:
        valueOfQuotesSignedData.thisPeriod.current -
        valueOfQuotesSignedData.lastPeriod.currentAtSameDay,
      progress:
        valueOfQuotesSignedData.thisPeriod.current / valueOfQuotesSignedData.thisPeriod.goal,
      isMoney: true,
    },
    {
      title: "Revenue",
      value: revenueData.thisPeriod.current,
      paceDelta: revenueData.thisPeriod.current - revenueData.lastPeriod.currentAtSameDay,
      progress: revenueData.thisPeriod.current / revenueData.thisPeriod.goal,
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
