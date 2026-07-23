"use client";

import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { useIsSubscribedToEvent } from "./useEventSubscriptions";

/**
 * Who can open the members modal, add/kick, and write messages.
 *
 * Admin: manage members even when not subscribed; can always write.
 * AM: must be subscribed to manage members or write; kicked AM can read only.
 */
export function useEventChatMemberAccess(eventUuid: string) {
  const { isAdmin, isAccountManager, userId } = usePermissionsStore();
  const isSubscribed = useIsSubscribedToEvent(eventUuid, userId);

  const canManageMembers = isAdmin || (isAccountManager && isSubscribed);
  const canWrite = isAdmin || isSubscribed;

  return {
    isSubscribed,
    canManageMembers,
    canWrite,
  };
}
