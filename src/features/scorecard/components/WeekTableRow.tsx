import { EventWithUser } from "../db";
import { useUsersStore } from "@/state/userStore";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type WeekTableRowProps = {
  event: EventWithUser;
};

export function WeekTableRow({ event }: WeekTableRowProps) {
  const users = useUsersStore((s) => s.users);
  const { user: clerkUser } = useClerkUser();

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get the account manager's clerk user ID
  const accountManager = event.account_manager;
  const clerkUserId = accountManager?.clerk_user_id;

  // For now, we can only show the avatar for the current logged-in user
  // Clerk doesn't expose other users' image URLs without fetching from their API
  const avatarUrl = useMemo(() => {
    if (clerkUserId && clerkUser?.id === clerkUserId) {
      return clerkUser.imageUrl;
    }
    return null;
  }, [clerkUserId, clerkUser]);

  return (
    <tr className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out">
      <td className="py-2 px-3 text-left">
        <div className="flex items-center gap-3">
          <Avatar
            className="w-8 h-8 cursor-pointer"
            title={
              accountManager
                ? `${accountManager.first_name} ${accountManager.last_name}`
                : "Unassigned"
            }
          >
            <AvatarImage
              src={avatarUrl || undefined}
              alt={`${accountManager?.first_name} ${accountManager?.last_name}`}
              className="object-cover"
            />
            <AvatarFallback className="bg-gray-300 text-gray-600 font-semibold">
              {accountManager?.first_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold">{event.event_name}</span>
            {/* <span className="text-sm text-gray-600">
              Quoted: {formatFullDate(event.created_at)} • Event {formatDate(event.event_start)} to{" "}
              {formatDate(event.event_end)}
            </span> */}
            <span className="text-sm text-gray-600">
              {formatDate(event.event_start)} to {formatDate(event.event_end)}
            </span>
          </div>
        </div>
      </td>
      <td className="py-1 px-3 text-left">{formatFullDate(event.created_at)}</td>
      <td className="py-1 px-3 text-left">
        {event.contract_revenue_cents
          ? `$${(event.contract_revenue_cents / 100).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "—"}
      </td>
      <td className="py-1 px-3 text-left">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            event.contract_status === "BOOKED"
              ? "bg-green-100 text-green-800"
              : event.contract_status === "LOST"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {event.contract_status}
        </span>
      </td>
    </tr>
  );
}
