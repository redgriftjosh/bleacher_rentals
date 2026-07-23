"use client";

import { useEffect, useMemo, useRef } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { subscribeToEvent } from "../db/subscriptions";

type EventOwnerRow = {
  created_by_user_uuid: string | null;
};

/**
 * Ensures the event owner is subscribed to internal chat (local-first + existing events).
 * Idempotent — safe to run whenever the chat is opened.
 */
export function useAutoSubscribeEventOwner(eventUuid: string) {
  const userUuid = usePermissionsStore((s) => s.userId);
  const subscribedRef = useRef<string | null>(null);

  const compiled = useMemo(
    () =>
      db
        .selectFrom("Events")
        .select(["created_by_user_uuid"])
        .where("id", "=", eventUuid)
        .where("deleted", "=", 0)
        .limit(1)
        .compile(),
    [eventUuid],
  );

  const { data } = useTypedQuery(compiled, expect<EventOwnerRow>());
  const ownerUserUuid = data?.[0]?.created_by_user_uuid ?? null;

  useEffect(() => {
    subscribedRef.current = null;
  }, [eventUuid]);

  useEffect(() => {
    if (!userUuid || !ownerUserUuid || userUuid !== ownerUserUuid) return;

    const key = `${eventUuid}:${ownerUserUuid}`;
    if (subscribedRef.current === key) return;

    subscribedRef.current = key;
    void subscribeToEvent(eventUuid, ownerUserUuid);
  }, [eventUuid, ownerUserUuid, userUuid]);
}
