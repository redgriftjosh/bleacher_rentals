import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { Duration } from "luxon";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { CurrentEventState, CurrentEventStore, useCurrentEventStore } from "./useCurrentEventStore";
import { Tables } from "../../../../../database.types";
import { useEventsStore } from "@/state/eventsStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { SelectHomeBase } from "@/types/tables/HomeBases";

export function checkEventFormRules(createEventPayload: CurrentEventStore): boolean {
  // check if all required fields are filled in
  let missingFields = [];
  if (createEventPayload.eventName == "") {
    missingFields.push("Missing: Event Name");
  }
  if (createEventPayload.addressData == null || createEventPayload.addressData.address == "") {
    missingFields.push("Missing: Address");
  }
  if (!createEventPayload.eventStart || createEventPayload.eventStart == "") {
    missingFields.push("Missing: Event Start");
  }
  if (!createEventPayload.eventEnd || createEventPayload.eventEnd == "") {
    missingFields.push("Missing: Event End");
  }
  if (!createEventPayload.setupStart || createEventPayload.setupStart == "") {
    if (!createEventPayload.sameDaySetup) {
      missingFields.push("Missing: Setup Start");
    }
  }
  if (!createEventPayload.teardownEnd || createEventPayload.teardownEnd == "") {
    if (!createEventPayload.sameDayTeardown) {
      missingFields.push("Missing: Teardown End");
    }
  }

  // Lenient Conditions
  if (createEventPayload.lenient) {
    if (!createEventPayload.seats || createEventPayload.seats == 0) {
      missingFields.push("Need at least one seat");
    }
  } else {
    const totalBleachers =
      (createEventPayload.sevenRow || 0) +
      (createEventPayload.tenRow || 0) +
      (createEventPayload.fifteenRow || 0);

    if (totalBleachers == 0) {
      missingFields.push("Select at least one bleacher");
    }
  }
  if (missingFields.length > 0) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: missingFields,
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    return false;
  } else {
    return true;
  }
}

export const calculateNumDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return days;
};

export function calculateBestHue(
  currentEvent: CurrentEventStore,
  events: Tables<"Events">[]
): number | null {
  if (!currentEvent.eventStart || !currentEvent.eventEnd) return null;

  const currentStart = new Date(currentEvent.eventStart);
  const currentEnd = new Date(currentEvent.eventEnd);

  // Define the window to search around the current event
  const windowStart = new Date(currentStart);
  windowStart.setMonth(currentStart.getMonth() - 2);

  const windowEnd = new Date(currentEnd);
  windowEnd.setMonth(currentEnd.getMonth() + 2);

  const eventsWithinRange = events.filter((event) => {
    const eventStart = new Date(event.event_start);
    const eventEnd = new Date(event.event_end);

    // Check if the event overlaps with the 2-month window
    return eventStart <= windowEnd && eventEnd >= windowStart;
  });

  console.log(
    "eventsWithinRange",
    eventsWithinRange.map((e) => e.event_name)
  );

  const existingHues = eventsWithinRange
    .map((event) => event.hsl_hue)
    .filter((hue) => hue !== null);

  // Exclude hues 40-70 because they look ugly with the yellow setup and teardown blocks
  const forbiddenHues = Array.from({ length: 31 }, (_, i) => i + 40); // [40, 41, ..., 70]
  console.log("forbiddenHues", forbiddenHues);
  existingHues.push(...forbiddenHues);

  if (existingHues.length === 0) return Math.floor(Math.random() * 360);

  // Normalize and sort hues
  const sorted = [...new Set(existingHues.map((h) => ((h % 360) + 360) % 360))].sort(
    (a, b) => a - b
  );
  console.log("sorted", sorted);

  let maxGap = 0;
  let newHue = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[(i + 1) % sorted.length]; // wrap around
    const gap = (next > current ? next : next + 360) - current;
    console.log(`${i} current-${current}, next-${next}, gap ${gap}`);

    if (gap > maxGap) {
      maxGap = gap;
      newHue = (gap / 2 + current) % 360;
    }
  }
  console.log("maxGap ", maxGap);
  console.log("newHue (unrounded)", newHue);

  return Math.round(newHue);
}

export function calculateEventAlerts(
  events: Tables<"Events">[],
  bleacherEvents: Tables<"BleacherEvents">[]
): Record<number, string[]> {
  const alerts: Record<number, string[]> = {};

  for (const event of events) {
    const eventAlerts: string[] = [];

    // Find all bleachers linked to this event
    const bleachersInThisEvent = bleacherEvents
      .filter((be) => be.event_id === event.event_id)
      .map((be) => be.bleacher_id);

    if (bleachersInThisEvent.length === 0) {
      alerts[event.event_id] = eventAlerts;
      continue;
    }

    // Find all bleacher events where the bleacher is shared
    const overlappingBleacherEvents = bleacherEvents.filter(
      (be) => bleachersInThisEvent.includes(be.bleacher_id) && be.event_id !== event.event_id
    );

    const overlappingEventIds = [...new Set(overlappingBleacherEvents.map((be) => be.event_id))];

    const overlappingEvents = events.filter((e) => overlappingEventIds.includes(e.event_id));

    const thisSetupStart = event.setup_start
      ? new Date(event.setup_start)
      : new Date(event.event_start);
    const thisTeardownEnd = event.teardown_end
      ? new Date(event.teardown_end)
      : new Date(event.event_end);

    for (const otherEvent of overlappingEvents) {
      const otherSetupStart = otherEvent.setup_start
        ? new Date(otherEvent.setup_start)
        : new Date(otherEvent.event_start);
      const otherTeardownEnd = otherEvent.teardown_end
        ? new Date(otherEvent.teardown_end)
        : new Date(otherEvent.event_end);

      // Check if times overlap
      if (thisSetupStart <= otherTeardownEnd && otherSetupStart <= thisTeardownEnd) {
        eventAlerts.push("This event is overlapping with other events!");
        break; // Only need to push once per event even if multiple overlaps
      }
    }

    alerts[event.event_id] = eventAlerts;
  }

  return alerts;
}

export function updateCurrentEventAlerts() {
  const state = useCurrentEventStore.getState();
  const events = useEventsStore.getState().events;
  const bleacherEvents = useBleacherEventsStore.getState().bleacherEvents;
  // console.log("updateCurrentEventAlerts");

  // Only calculate if necessary
  if (!state.eventStart || !state.eventEnd) return;

  const oldAlerts = state.alerts;
  const newAlerts = calculateConflictsForSingleEvent(state, events, bleacherEvents);

  const isDifferent =
    oldAlerts.length !== newAlerts.length || oldAlerts.some((a, i) => a !== newAlerts[i]);

  if (isDifferent) {
    useCurrentEventStore.getState().setField("alerts", newAlerts);
  }
}

export function calculateConflictsForSingleEvent(
  currentEvent: CurrentEventState,
  allEvents: Tables<"Events">[],
  allBleacherEvents: Tables<"BleacherEvents">[]
): string[] {
  const alerts: string[] = [];

  const currentSetupStart = currentEvent.setupStart
    ? new Date(currentEvent.setupStart)
    : new Date(currentEvent.eventStart);

  const currentTeardownEnd = currentEvent.teardownEnd
    ? new Date(currentEvent.teardownEnd)
    : new Date(currentEvent.eventEnd);

  // Build a lookup: event_id => bleacher_ids[]
  const eventIdToBleachers: Record<number, number[]> = {};
  for (const be of allBleacherEvents) {
    if (!eventIdToBleachers[be.event_id]) {
      eventIdToBleachers[be.event_id] = [];
    }
    eventIdToBleachers[be.event_id].push(be.bleacher_id);
  }

  for (const event of allEvents) {
    if (event.event_id === currentEvent.eventId) continue; // Don't compare with self

    const eventSetupStart = event.setup_start
      ? new Date(event.setup_start)
      : new Date(event.event_start);

    const eventTeardownEnd = event.teardown_end
      ? new Date(event.teardown_end)
      : new Date(event.event_end);

    const bleachersInOtherEvent = eventIdToBleachers[event.event_id] || [];

    // Check if bleachers overlap
    const bleacherOverlap = bleachersInOtherEvent.some((id) =>
      currentEvent.bleacherIds.includes(id)
    );

    if (!bleacherOverlap) continue;

    // Check if times overlap
    if (currentSetupStart <= eventTeardownEnd && eventSetupStart <= currentTeardownEnd) {
      alerts.push("This event is overlapping with other events!");
      break; // Only need one conflict to show the alert
    }
  }

  return alerts;
}

export function getHomeBaseOptions() {
  const homeBases = useHomeBasesStore((s) => s.homeBases) as SelectHomeBase[];

  return homeBases.map((homeBase) => ({
    value: homeBase.home_base_id,
    label: homeBase.home_base_name,
  }));
}
