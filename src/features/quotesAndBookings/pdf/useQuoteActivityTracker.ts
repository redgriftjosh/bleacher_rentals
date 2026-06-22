"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export type TrackEvent = {
  action_type: string;
  field_name?: string | null;
  prev_value?: string | null;
  next_value?: string | null;
};

export function buildActivityPayload(event: TrackEvent): string {
  return JSON.stringify({
    action_type: event.action_type,
    field_name: event.field_name ?? null,
    prev_value: event.prev_value ?? null,
    next_value: event.next_value ?? null,
  });
}

export function useQuoteActivityTracker(eventId: string): (event: TrackEvent) => void {
  const { userId } = useAuth();

  return useCallback(
    (event: TrackEvent) => {
      if (userId) {
        return;
      }
      fetch(`/api/quotes/${eventId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: buildActivityPayload(event),
      });
    },
    [eventId, userId],
  );
}
