import { useUser as useClerkUser } from "@clerk/nextjs";
import { EventWithUser } from "../db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type WeekWinnerCardProps = {
  events: EventWithUser[];
};

type WinnerData = {
  manager: NonNullable<EventWithUser["account_manager"]>;
  total: number;
};

export function WeekWinnerCard({ events }: WeekWinnerCardProps) {
  const { user: clerkUser } = useClerkUser();

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Calculate total booked value per account manager
  const managerTotals = new Map<string, WinnerData>();

  events.forEach((event) => {
    if (event.contract_status === "BOOKED" && event.account_manager) {
      const key = `${event.account_manager.first_name}_${event.account_manager.last_name}`;
      const existing = managerTotals.get(key);
      const value = event.contract_revenue_cents || 0;

      if (existing) {
        existing.total += value;
      } else {
        managerTotals.set(key, {
          manager: event.account_manager,
          total: value,
        });
      }
    }
  });

  // Find the winner (highest total)
  let winner: WinnerData | null = null;
  managerTotals.forEach((entry) => {
    if (!winner || entry.total > winner.total) {
      winner = entry;
    }
  });

  if (!winner) {
    return null; // Don't show anything if no booked events
  }

  // Type guard after null check
  const winnerData: WinnerData = winner;

  const isCurrentUser = clerkUser?.id === winnerData.manager.clerk_user_id;
  const avatarUrl = isCurrentUser && clerkUser ? clerkUser.imageUrl : null;

  return (
    <div className="flex items-center gap-2">
      {/* <span className="text-xs font-bold text-center text-gray-700">
        {formatCurrency(winnerData.total)}
      </span> */}
      <div className="relative">
        <Avatar
          className="w-9 h-9 border-2 border-yellow-400"
          title={`Top Performer: ${winnerData.manager.first_name} ${winnerData.manager.last_name}`}
        >
          <AvatarImage
            src={avatarUrl || undefined}
            alt={`${winnerData.manager.first_name} ${winnerData.manager.last_name}`}
            className="object-cover"
          />
          <AvatarFallback className="bg-yellow-100 text-yellow-700 font-bold">
            {winnerData.manager.first_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-white font-bold rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
          #1
        </div>
      </div>
    </div>
  );
}
