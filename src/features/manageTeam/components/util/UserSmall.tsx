"use client";

import { UserAvatar } from "./UserAvatar";

type UserSmallProps = {
  clerkUserId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
};

export function UserSmall({ clerkUserId, firstName, lastName, className }: UserSmallProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";

  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <UserAvatar
        clerkUserId={clerkUserId}
        firstName={firstName}
        lastName={lastName}
        className="w-8 h-8"
      />
      <span className="font-medium text-sm text-gray-700">{displayName}</span>
    </div>
  );
}
