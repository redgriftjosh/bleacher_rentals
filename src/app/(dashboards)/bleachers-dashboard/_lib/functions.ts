import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { Duration } from "luxon";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { CurrentEventStore } from "./useCurrentEventStore";
import { Tables } from "../../../../../database.types";

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
