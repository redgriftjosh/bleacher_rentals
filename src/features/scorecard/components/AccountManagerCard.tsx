"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompactStatWithRing } from "./CompactStatWithRing";
import type { AccountManagerScorecard, TimeRange } from "../types";

type AccountManagerCardProps = {
  scorecard: AccountManagerScorecard;
  timeRange: TimeRange;
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

export function AccountManagerCard({ scorecard, timeRange: _timeRange }: AccountManagerCardProps) {
  const { manager } = scorecard;
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  if (!params.get("dataType")) params.set("dataType", "all");
  if (!params.get("timeRange")) params.set("timeRange", "weekly");
  params.set("accountManager", manager.userUuid);
  const href = `/scorecard?${params.toString()}`;

  return (
    <Link
      href={href}
      className="block bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={manager.avatarUrl ?? undefined} />
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
        {PLACEHOLDER_STATS.map((stat) => (
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
