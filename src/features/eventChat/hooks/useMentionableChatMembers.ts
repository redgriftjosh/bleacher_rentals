"use client";

import { useMemo } from "react";
import {
  chatUserDisplayName,
  useChatEligibleUsers,
  type ChatEligibleUser,
} from "./useChatEligibleUsers";
import { useEventSubscriptions } from "./useEventSubscriptions";

/**
 * Admins / AMs who are subscribed to this event chat — eligible @mention targets.
 * Excludes the current user (you cannot mention yourself).
 */
export function useMentionableChatMembers(eventUuid: string, currentUserUuid: string | null) {
  const { users } = useChatEligibleUsers();
  const { subscribedUserIds } = useEventSubscriptions(eventUuid);

  const members = useMemo(
    () =>
      users
        .filter((u) => subscribedUserIds.has(u.userUuid))
        .filter((u) => u.userUuid !== currentUserUuid)
        .sort((a, b) => chatUserDisplayName(a).localeCompare(chatUserDisplayName(b))),
    [users, subscribedUserIds, currentUserUuid],
  );

  return { members };
}

export type { ChatEligibleUser };
