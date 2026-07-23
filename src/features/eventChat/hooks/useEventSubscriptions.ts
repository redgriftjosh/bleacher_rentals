"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type SubscriptionRow = {
  id: string;
  event_uuid: string | null;
  user_uuid: string | null;
  created_at: string | null;
};

/** Reactive list of users subscribed to one event's internal chat. */
export function useEventSubscriptions(eventUuid: string) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventSubscriptions")
        .select(["id", "event_uuid", "user_uuid", "created_at"])
        .where("event_uuid", "=", eventUuid)
        .compile(),
    [eventUuid],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<SubscriptionRow>());

  const subscriptions = useMemo(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        event_uuid: r.event_uuid ?? "",
        user_uuid: r.user_uuid ?? "",
        created_at: r.created_at ?? "",
      })),
    [data],
  );

  const subscribedUserIds = useMemo(
    () => new Set(subscriptions.map((s) => s.user_uuid)),
    [subscriptions],
  );

  return { subscriptions, subscribedUserIds, isLoading };
}

/** True when the given user is an active member of the event chat (can write). */
export function useIsSubscribedToEvent(eventUuid: string, userUuid: string | null) {
  const { subscribedUserIds } = useEventSubscriptions(eventUuid);
  return useMemo(
    () => (userUuid ? subscribedUserIds.has(userUuid) : false),
    [subscribedUserIds, userUuid],
  );
}
