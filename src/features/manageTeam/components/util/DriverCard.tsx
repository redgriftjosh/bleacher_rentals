"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";

type DriverCardProps = {
  firstName: string | null;
  lastName: string | null;
  clerkUserId: string | null;
  isSelected: boolean;
  onClick: () => void;
  assignedUser?: {
    clerkUserId: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  isDisabled?: boolean;
};

export function DriverCard({
  firstName,
  lastName,
  clerkUserId,
  isSelected,
  onClick,
  assignedUser,
  isDisabled = false,
}: DriverCardProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "relative w-full px-3 py-2 rounded border transition-all duration-200 cursor-pointer",
        "flex items-center justify-between gap-2",
        isDisabled
          ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-60"
          : isSelected
            ? "border-greenAccent bg-greenAccent/10 hover:shadow-md hover:border-greenAccent/50"
            : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md hover:border-greenAccent/50",
      )}
    >
      <div className="flex items-center gap-2">
        <UserAvatar
          clerkUserId={clerkUserId}
          firstName={firstName}
          lastName={lastName}
          className="w-7 h-7"
        />
        <span className={cn("text-sm font-medium", isDisabled ? "text-gray-400" : "text-gray-700")}>
          {displayName}
        </span>
      </div>
      {isDisabled && assignedUser ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">
            {[assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(" ")}
          </span>
          <UserAvatar
            clerkUserId={assignedUser.clerkUserId}
            firstName={assignedUser.firstName}
            lastName={assignedUser.lastName}
            className="w-6 h-6"
          />
        </div>
      ) : isSelected ? (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-greenAccent">
          <Check className="w-4 h-4 text-white" />
        </div>
      ) : null}
    </button>
  );
}
