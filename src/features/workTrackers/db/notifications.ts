import { Database, Enums } from "../../../../database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

type WorkTrackerStatus = Enums<"worktracker_status">;

type TripNotificationInput = {
  previousStatus: WorkTrackerStatus;
  nextStatus: WorkTrackerStatus;
  pickupAddress: string;
  pickupCity?: string;
  dropoffAddress: string;
  dropoffCity?: string;
  date: string | null;
};

export type DriverNotificationPreview = {
  title: string;
  body: string;
};

function withOrdinal(day: number): string {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatDriverTripDate(dateIso: string | null): string {
  if (!dateIso) return "an upcoming day";

  const dt = DateTime.fromISO(dateIso);
  if (!dt.isValid) return dateIso;

  return `${dt.toFormat("ccc, LLLL")} ${withOrdinal(dt.day)}`;
}

export function formatWeekRangeForDriverNotification(startDateIso: string): string {
  const start = DateTime.fromISO(startDateIso);
  if (!start.isValid) return startDateIso;

  const end = start.plus({ days: 6 });
  return `${start.toFormat("LLLL")} ${withOrdinal(start.day)} to ${end.toFormat("LLLL")} ${withOrdinal(end.day)}`;
}

function compactAddress(street: string, city?: string): string {
  const value = street.trim();
  if (value.length === 0) return "an unknown location";

  const firstCommaIndex = value.indexOf(",");
  const firstSegment =
    firstCommaIndex >= 0 ? value.slice(0, firstCommaIndex + 1).trim() : value;

  const cleanCity = (city ?? "").trim();
  if (!cleanCity) {
    return firstSegment.endsWith(",") ? firstSegment.slice(0, -1).trim() : firstSegment;
  }

  const base = firstSegment.endsWith(",") ? firstSegment : `${firstSegment},`;
  return `${base} ${cleanCity}`;
}

export function buildTripStatusNotification(
  input: TripNotificationInput,
): DriverNotificationPreview | null {
  const pickup = compactAddress(input.pickupAddress, input.pickupCity);
  const dropoff = compactAddress(input.dropoffAddress, input.dropoffCity);
  const dateText = formatDriverTripDate(input.date);

  if (input.previousStatus === "draft" && input.nextStatus === "draft") {
    return null;
  }

  if (input.previousStatus === "draft" && input.nextStatus !== "draft") {
    return {
      title: "You Received a New Trip!",
      body: `New trip from ${pickup} to ${dropoff} on ${dateText}`,
    };
  }

  if (input.previousStatus !== "draft" && input.nextStatus === "draft") {
    return {
      title: "We removed one of your trips",
      body: `We removed your trip from ${pickup} to ${dropoff} on ${dateText}`,
    };
  }

  return {
    title: "We Made Changes to Your Trip!",
    body: `We made changes to your trip from ${pickup} to ${dropoff} on ${dateText}`,
  };
}

export function buildTripDeletedNotification(input: {
  pickupAddress: string;
  pickupCity?: string;
  dropoffAddress: string;
  dropoffCity?: string;
  date: string | null;
}): DriverNotificationPreview {
  const pickup = compactAddress(input.pickupAddress, input.pickupCity);
  const dropoff = compactAddress(input.dropoffAddress, input.dropoffCity);
  const dateText = formatDriverTripDate(input.date);

  return {
    title: "We removed one of your trips",
    body: `We removed your trip from ${pickup} to ${dropoff} on ${dateText}`,
  };
}

export function buildReleaseAllNotification(
  count: number,
  startDateIso: string,
): DriverNotificationPreview {
  const weekRange = formatWeekRangeForDriverNotification(startDateIso);
  const countText = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

  return {
    title: `You Have ${countText} New Trips!`,
    body: `${countText} Trips have just been released to you for the week of ${weekRange}. Open the app to accept them`,
  };
}

export async function insertDriverNotification(
  supabase: SupabaseClient<Database>,
  userUuid: string,
  preview: DriverNotificationPreview,
): Promise<void> {
  const { error } = await supabase.from("Notifications").insert({
    user_id: userUuid,
    title: preview.title,
    body: preview.body,
  });

  if (error) {
    throw new Error(error.message);
  }
}
