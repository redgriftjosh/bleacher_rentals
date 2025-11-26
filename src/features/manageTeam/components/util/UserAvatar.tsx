"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { useMemo } from "react";

type UserAvatarProps = {
  clerkUserId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
};

export function UserAvatar({ clerkUserId, firstName, lastName, className }: UserAvatarProps) {
  const { user: clerkUser } = useClerkUser();

  // For now, we can only show the avatar for the current logged-in user
  // Clerk doesn't expose other users' image URLs without fetching from their API
  const avatarUrl = useMemo(() => {
    if (clerkUserId && clerkUser?.id === clerkUserId) {
      return clerkUser.imageUrl;
    }
    return null;
  }, [clerkUserId, clerkUser]);

  const initials = useMemo(() => {
    const first = firstName?.[0]?.toUpperCase() || "";
    const last = lastName?.[0]?.toUpperCase() || "";
    return first + last || "?";
  }, [firstName, lastName]);

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";

  return (
    <Avatar className={className || "w-8 h-8"} title={displayName}>
      <AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
      <AvatarFallback className="bg-gray-300 text-gray-600 font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
