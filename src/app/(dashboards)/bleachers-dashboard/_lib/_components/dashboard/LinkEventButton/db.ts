// import { createErrorToast } from "@/components/toasts/ErrorToast";
// import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
// import { DateTime } from "luxon";
// import { EventForWorkTracker } from "./types";
// import { AddressData } from "../../../useCurrentEventStore";

// export async function fetchEventsForWorkTracker(
//   date: string,
//   bleacherId: number,
//   pickUpOrDropOff: "pickup" | "dropoff",
//   token: string | null
// ): Promise<EventForWorkTracker[]> {
//   if (!token) {
//     createErrorToast(["No token found"]);
//     return [];
//   }

//   const targetDate = DateTime.fromISO(date);
//   const sixMonthsBefore = targetDate.minus({ months: 6 }).toISODate();
//   const sixMonthsAfter = targetDate.plus({ months: 6 }).toISODate();

//   const supabase = await getSupabaseClient(token);
//   const { data, error } = await supabase
//     .from("Events")
//     .select("event_id, event_name, event_start, event_end, hsl_hue, poc, address_id")
//     .or(`event_end.gte.${sixMonthsBefore},event_start.lte.${sixMonthsAfter}`);

//   if (error) {
//     createErrorToast(["Failed to fetch events.", error.message]);
//   }

//   const events = data.map((e) => ({
//     id: e.event_id,
//     name: e.event_name,
//     start: e.event_start,
//     end: e.event_end,
//     hslHue: e.hsl_hue,
//   }));

//   // Fetch all event_ids associated with this bleacher
//   const { data: linkedEventData, error: linkError } = await supabase
//     .from("BleacherEvents")
//     .select("event_id")
//     .eq("bleacher_id", bleacherId);

//   if (linkError) {
//     createErrorToast(["Failed to fetch linked bleacher events.", linkError.message]);
//   }

//   const bleacherEventIds = new Set(linkedEventData.map((be) => be.event_id));

//   // Find recommended event from events linked to this bleacher
//   let recommendedEventId: number | undefined;

//   if (pickUpOrDropOff === "pickup") {
//     const before = events
//       .filter((e) => bleacherEventIds.has(e.id) && DateTime.fromISO(e.start) < targetDate)
//       .sort((a, b) => DateTime.fromISO(b.start).toMillis() - DateTime.fromISO(a.start).toMillis());
//     if (before.length > 0) recommendedEventId = before[0].id;
//   } else {
//     const after = events
//       .filter((e) => bleacherEventIds.has(e.id) && DateTime.fromISO(e.end) > targetDate)
//       .sort((a, b) => DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis());
//     if (after.length > 0) recommendedEventId = after[0].id;
//   }

//   const result = events.map((e) => ({
//     ...e,
//     recommended: e.id === recommendedEventId,
//   }));
//   // put the recommended event first
//   const recommended = result.find((e) => e.recommended);
//   if (recommended) {
//     result.splice(result.indexOf(recommended), 1);
//     result.unshift(recommended);
//   }

//   return result;
// }

// export async function fetchEventPocForWorkTracker(
//   eventId: number,
//   token: string | null
// ): Promise<{ poc: string | null; hslHue: number | null }> {
//   // console.log("fetchEventPocForWorkTracker", eventId, token);
//   if (!token) {
//     createErrorToast(["No token found"]);
//   }

//   const supabase = await getSupabaseClient(token);
//   const { data, error } = await supabase
//     .from("Events")
//     .select("poc, hsl_hue")
//     .eq("event_id", eventId)
//     .single();

//   if (error) {
//     createErrorToast(["Failed to fetch event POC.", error.message]);
//   }
//   const result = {
//     poc: data?.poc ?? null,
//     hslHue: data?.hsl_hue ?? null,
//   };

//   return result;
// }

// export async function fetchEventAddressForWorkTracker(
//   eventId: number,
//   token: string | null
// ): Promise<{ address: AddressData | null; hslHue: number | null }> {
//   if (!token) {
//     createErrorToast(["No token found"]);
//   }

//   const supabase = await getSupabaseClient(token);
//   const { data, error } = await supabase
//     .from("Events")
//     .select("address_id, hsl_hue")
//     .eq("event_id", eventId)
//     .single();

//   if (error) {
//     createErrorToast(["Failed to fetch event address.", error.message]);
//   }
//   if (!data?.address_id) return { address: null, hslHue: data?.hsl_hue ?? null };

//   const { data: addressData, error: addressError } = await supabase
//     .from("Addresses")
//     .select("*")
//     .eq("address_id", data.address_id)
//     .single();
//   if (addressError) {
//     createErrorToast(["Failed to fetch event address.", addressError.message]);
//   }
//   const resultAddress: AddressData = {
//     addressId: addressData?.address_id ?? null,
//     address: addressData?.street ?? "",
//     city: addressData?.city ?? "",
//     state: addressData?.state_province ?? "",
//     postalCode: addressData?.zip_postal ?? "",
//   };
//   return { address: resultAddress, hslHue: data?.hsl_hue ?? null };
// }
