import { CurrentEventState } from "@/features/eventConfiguration/state/useCurrentEventStore";

/**
 * Builds a human-readable description for event-scoped alerts.
 * Format: "Event Name — Address" when both are present, otherwise just whichever is available.
 * Returns null if neither is set.
 */
export function eventEntityDescription(event: CurrentEventState): string | null {
  return [event.eventName, event.addressData?.address].filter(Boolean).join(" — ") || null;
}
