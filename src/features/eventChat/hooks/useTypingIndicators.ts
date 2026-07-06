"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useCallback, useMemo, useRef } from "react";
import { setEventTyping } from "../db/typingIndicators";

type Row = {
  id: string;
  event_uuid: string | null;
  user_uuid: string | null;
  is_typing: number | null;
  updated_at: string | null;
};

/** Ignore typing rows older than this — handles clients that never sent "stopped typing". */
const STALE_THRESHOLD_MS = 10_000;

/**
 * Subscribes to who is currently typing in this event's chat (excluding self).
 * Used to render the "X is typing…" line at the bottom of the message list.
 */
export function useEventTypingIndicators(eventUuid: string, currentUserUuid: string | null) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventTypingIndicators")
        .select(["id", "event_uuid", "user_uuid", "is_typing", "updated_at"])
        .where("event_uuid", "=", eventUuid)
        .compile(),
    [eventUuid],
  );

  const { data } = useTypedQuery(compiled, expect<Row>());

  const typingUserUuids = useMemo(() => {
    const now = Date.now();
    return (data ?? [])
      .filter((r) => {
        if (!r.is_typing || r.user_uuid === currentUserUuid) return false;
        if (!r.updated_at) return false;
        const age = now - new Date(r.updated_at).getTime();
        return age < STALE_THRESHOLD_MS;
      })
      .map((r) => r.user_uuid ?? "");
  }, [data, currentUserUuid]);

  return { typingUserUuids };
}

/**
 * Call emitTyping() on each keystroke; auto-clears after 2s idle.
 * Call stopTyping() when sending a message so the indicator disappears immediately.
 */
export function useEventTypingEmitter(eventUuid: string, userUuid: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const emitTyping = useCallback(() => {
    if (!eventUuid || !userUuid) return;

    // First keystroke in a burst — write is_typing=true once.
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      void setEventTyping(eventUuid, userUuid, true);
    }

    // Reset idle timer: stop typing 2s after last keystroke.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      void setEventTyping(eventUuid, userUuid, false);
    }, 2000);
  }, [eventUuid, userUuid]);

  const stopTyping = useCallback(() => {
    if (!eventUuid || !userUuid) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      void setEventTyping(eventUuid, userUuid, false);
    }
  }, [eventUuid, userUuid]);

  return { emitTyping, stopTyping };
}
