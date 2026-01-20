// import { toast } from "sonner";
// import React from "react";
// import { ErrorToast } from "@/components/toasts/ErrorToast";
// import {
//   AddressData,
//   CurrentEventState,
//   CurrentEventStore,
//   useCurrentEventStore,
// } from "../eventConfiguration/state/useCurrentEventStore";
// import { useEventsStore } from "@/state/eventsStore";
// import { useBleacherEventsStore } from "@/state/bleacherEventStore";
// import { UserResource } from "@clerk/types";
// import { PROVINCES, ROW_OPTIONS, STATES } from "@/types/Constants";
// import { Tables } from "../../../database.types";
// import { DashboardBleacher } from "../dashboard/types";

// export function checkEventFormRules(
//   createEventPayload: CurrentEventStore,
//   user: UserResource | null
// ): boolean {
//   // check if all required fields are filled in
//   let missingFields = [];
//   // const error = isUserPermitted(createEventPayload.addressData?.state ?? "", user);
//   // if (error) {
//   //   missingFields.push(error);
//   // }
//   if (createEventPayload.eventName == "") {
//     missingFields.push("Missing: Event Name");
//   }
//   if (createEventPayload.addressData == null || createEventPayload.addressData.address == "") {
//     missingFields.push("Missing: Address");
//   }
//   if (!createEventPayload.eventStart || createEventPayload.eventStart == "") {
//     missingFields.push("Missing: Event Start");
//   }
//   if (!createEventPayload.eventEnd || createEventPayload.eventEnd == "") {
//     missingFields.push("Missing: Event End");
//   }
//   // if (!createEventPayload.setupStart || createEventPayload.setupStart == "") {
//   //   if (!createEventPayload.sameDaySetup) {
//   //     missingFields.push("Missing: Setup Start");
//   //   }
//   // }
//   // if (!createEventPayload.teardownEnd || createEventPayload.teardownEnd == "") {
//   //   if (!createEventPayload.sameDayTeardown) {
//   //     missingFields.push("Missing: Teardown End");
//   //   }
//   // }

//   // Lenient Conditions
//   // if (createEventPayload.lenient) {
//   //   if (!createEventPayload.seats || createEventPayload.seats == 0) {
//   //     missingFields.push("Need at least one seat");
//   //   }
//   // } else {
//   //   const totalBleachers =
//   //     (createEventPayload.sevenRow || 0) +
//   //     (createEventPayload.tenRow || 0) +
//   //     (createEventPayload.fifteenRow || 0);

//   //   if (totalBleachers == 0) {
//   //     missingFields.push("Select at least one bleacher");
//   //   }
//   // }
//   if (createEventPayload.bleacherUuids.length === 0) {
//     missingFields.push("Select at least one bleacher");
//   }
//   if (missingFields.length > 0) {
//     toast.custom(
//       (t) =>
//         React.createElement(ErrorToast, {
//           id: t,
//           lines: missingFields,
//         }),
//       {
//         duration: 10000, // 20 seconds
//       }
//     );
//     return false;
//   } else {
//     return true;
//   }
// }

// export const calculateNumDays = (start: string, end: string): number => {
//   const startDate = new Date(start);
//   const endDate = new Date(end);
//   const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
//   const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
//   return days;
// };

// export function calculateBestHue(
//   currentEvent: CurrentEventStore,
//   events: Tables<"Events">[]
// ): number | null {
//   if (!currentEvent.eventStart || !currentEvent.eventEnd) return null;

//   const currentStart = new Date(currentEvent.eventStart);
//   const currentEnd = new Date(currentEvent.eventEnd);

//   // Define the window to search around the current event
//   const windowStart = new Date(currentStart);
//   windowStart.setMonth(currentStart.getMonth() - 2);

//   const windowEnd = new Date(currentEnd);
//   windowEnd.setMonth(currentEnd.getMonth() + 2);

//   const eventsWithinRange = events.filter((event) => {
//     const eventStart = new Date(event.event_start);
//     const eventEnd = new Date(event.event_end);

//     // Check if the event overlaps with the 2-month window
//     return eventStart <= windowEnd && eventEnd >= windowStart;
//   });

//   // console.log(
//   //   "eventsWithinRange",
//   //   eventsWithinRange.map((e) => e.event_name)
//   // );

//   const existingHues = eventsWithinRange
//     .map((event) => event.hsl_hue)
//     .filter((hue) => hue !== null);

//   // Exclude hues 40-70 because they look ugly with the yellow setup and teardown blocks
//   const forbiddenHues = Array.from({ length: 31 }, (_, i) => i + 40); // [40, 41, ..., 70]
//   // console.log("forbiddenHues", forbiddenHues);
//   existingHues.push(...forbiddenHues);

//   if (existingHues.length === 0) return Math.floor(Math.random() * 360);

//   // Normalize and sort hues
//   const sorted = [...new Set(existingHues.map((h) => ((h % 360) + 360) % 360))].sort(
//     (a, b) => a - b
//   );
//   // console.log("sorted", sorted);

//   let maxGap = 0;
//   let newHue = 0;

//   for (let i = 0; i < sorted.length; i++) {
//     const current = sorted[i];
//     const next = sorted[(i + 1) % sorted.length]; // wrap around
//     const gap = (next > current ? next : next + 360) - current;
//     // console.log(`${i} current-${current}, next-${next}, gap ${gap}`);

//     if (gap > maxGap) {
//       maxGap = gap;
//       newHue = (gap / 2 + current) % 360;
//     }
//   }
//   // console.log("maxGap ", maxGap);
//   // console.log("newHue (unrounded)", newHue);

//   return Math.round(newHue);
// }

// export function calculateEventAlerts(
//   events: Tables<"Events">[],
//   bleacherEvents: Tables<"BleacherEvents">[]
// ): Record<string, string[]> {
//   const alerts: Record<string, string[]> = {};

//   for (const event of events) {
//     const eventAlerts: string[] = [];

//     // Find all bleachers linked to this event
//     const bleachersInThisEvent = bleacherEvents
//       .filter((be) => be.event_uuid === event.id)
//       .map((be) => be.bleacher_uuid);

//     if (bleachersInThisEvent.length === 0) {
//       alerts[event.id] = eventAlerts;
//       continue;
//     }

//     // Find all bleacher events where the bleacher is shared
//     const overlappingBleacherEvents = bleacherEvents.filter(
//       (be) => bleachersInThisEvent.includes(be.bleacher_uuid) && be.event_uuid !== event.id
//     );

//     const overlappingEventUuids = [
//       ...new Set(overlappingBleacherEvents.map((be) => be.event_uuid)),
//     ];

//     const overlappingEvents = events.filter((e) => overlappingEventUuids.includes(e.id));

//     const thisSetupStart = event.setup_start
//       ? new Date(event.setup_start)
//       : new Date(event.event_start);
//     const thisTeardownEnd = event.teardown_end
//       ? new Date(event.teardown_end)
//       : new Date(event.event_end);

//     for (const otherEvent of overlappingEvents) {
//       const otherSetupStart = otherEvent.setup_start
//         ? new Date(otherEvent.setup_start)
//         : new Date(otherEvent.event_start);
//       const otherTeardownEnd = otherEvent.teardown_end
//         ? new Date(otherEvent.teardown_end)
//         : new Date(otherEvent.event_end);

//       // Check if times overlap
//       if (thisSetupStart <= otherTeardownEnd && otherSetupStart <= thisTeardownEnd) {
//         eventAlerts.push("This event is overlapping with other events!");
//         break; // Only need to push once per event even if multiple overlaps
//       }
//     }

//     alerts[event.id] = eventAlerts;
//   }

//   return alerts;
// }

// export function updateCurrentEventAlerts() {
//   const state = useCurrentEventStore.getState();
//   const events = useEventsStore.getState().events;
//   const bleacherEvents = useBleacherEventsStore.getState().bleacherEvents;
//   // console.log("updateCurrentEventAlerts");

//   // Only calculate if necessary
//   if (!state.eventStart || !state.eventEnd) return;

//   const oldAlerts = state.alerts;
//   const newAlerts = calculateConflictsForSingleEvent(state, events, bleacherEvents);

//   const isDifferent =
//     oldAlerts.length !== newAlerts.length || oldAlerts.some((a, i) => a !== newAlerts[i]);

//   if (isDifferent) {
//     useCurrentEventStore.getState().setField("alerts", newAlerts);
//   }
// }

// export function calculateConflictsForSingleEvent(
//   currentEvent: CurrentEventState,
//   allEvents: Tables<"Events">[],
//   allBleacherEvents: Tables<"BleacherEvents">[]
// ): string[] {
//   const alerts: string[] = [];

//   const currentSetupStart = currentEvent.setupStart
//     ? new Date(currentEvent.setupStart)
//     : new Date(currentEvent.eventStart);

//   const currentTeardownEnd = currentEvent.teardownEnd
//     ? new Date(currentEvent.teardownEnd)
//     : new Date(currentEvent.eventEnd);

//   // Build a lookup: event_id => bleacher_ids[]
//   const eventUuidToBleachers: Record<string, string[]> = {};
//   for (const be of allBleacherEvents) {
//     if (!be.event_uuid || !be.bleacher_uuid) continue;
//     if (!eventUuidToBleachers[be.event_uuid]) {
//       eventUuidToBleachers[be.event_uuid] = [];
//     }
//     eventUuidToBleachers[be.event_uuid].push(be.bleacher_uuid);
//   }

//   for (const event of allEvents) {
//     if (event.id === currentEvent.eventUuid) continue; // Don't compare with self

//     const eventSetupStart = event.setup_start
//       ? new Date(event.setup_start)
//       : new Date(event.event_start);

//     const eventTeardownEnd = event.teardown_end
//       ? new Date(event.teardown_end)
//       : new Date(event.event_end);

//     const bleachersInOtherEvent = eventUuidToBleachers[event.id] || [];

//     // Check if bleachers overlap
//     const bleacherOverlap = bleachersInOtherEvent.some((id) =>
//       currentEvent.bleacherUuids.includes(id)
//     );

//     if (!bleacherOverlap) continue;

//     // Check if times overlap
//     if (currentSetupStart <= eventTeardownEnd && eventSetupStart <= currentTeardownEnd) {
//       alerts.push("This event is overlapping with other events!");
//       break; // Only need one conflict to show the alert
//     }
//   }

//   return alerts;
// }

// // export function isUserPermitted(stateProv: string, user: UserResource | null): string | null {
// //   const users = useUsersStore.getState().users;
// //   const currentUser = users.find((u) => u.clerk_user_id === user?.id);
// //   const errorMessages = [
// //     "Error: Cannot Find Home Base",
// //     "Error: Cannot Find User",
// //     "You are not permitted to edit events in this region.",
// //   ];

// //   if (!currentUser) {
// //     return errorMessages[1];
// //   }

// //   if (currentUser.role === 2) return null; // Admin can access all events

// //   const userHomeBases = useUserHomeBasesStore.getState().userHomeBases;

// //   let eventHomeBaseId: number | null = null;
// //   try {
// //     eventHomeBaseId = getHomeBaseIdByName(stateProv);
// //     if (!eventHomeBaseId) return errorMessages[0];
// //   } catch (error) {
// //     return errorMessages[0];
// //   }

// //   // Check if any of the user's home base assignments match the eventHomeBaseId
// //   const isPermitted = userHomeBases.some(
// //     (uhb) => uhb.user_id === currentUser.user_id && uhb.home_base_id === eventHomeBaseId
// //   );

// //   if (!isPermitted) {
// //     return errorMessages[2];
// //   }
// //   return null;
// // }

// // should return something like this:
// //   return [
// //     { value: 7, label: "7" },
// //     { value: 8, label: "8" },
// //     etc...
// //   ];
// export function getRowOptions() {
//   return ROW_OPTIONS.map((value) => ({
//     value,
//     label: value.toString(),
//   }));
// }

// export function getStateProvOptions() {
//   const allOptions = [...STATES, ...PROVINCES];
//   return allOptions.map((value, index) => ({
//     value: index,
//     label: value,
//   }));
// }

// export function filterSortBleachers(
//   summerHomeBaseUuids: string[],
//   winterHomeBaseUuids: string[],
//   rows: number[],
//   bleachers: DashboardBleacher[],
//   bleacherUuids: string[],
//   isFormExpanded: boolean
// ): DashboardBleacher[] {
//   const matchesFilter = (b: DashboardBleacher) =>
//     summerHomeBaseUuids.includes(b.summerHomeBase.homeBaseUuid) &&
//     winterHomeBaseUuids.includes(b.winterHomeBase.homeBaseUuid) &&
//     rows.includes(b.bleacherRows);

//   const alwaysInclude = (b: DashboardBleacher) => bleacherUuids.includes(b.bleacherUuid);

//   // Keep all selected bleachers, even if they don't match the filters (when expanded)
//   const filteredBleachers = isFormExpanded
//     ? bleachers.filter((b) => matchesFilter(b) || alwaysInclude(b))
//     : bleachers.filter(matchesFilter);

//   const sortedBleachers = isFormExpanded
//     ? [
//         ...filteredBleachers
//           .filter(alwaysInclude)
//           .sort((a, b) => a.bleacherNumber - b.bleacherNumber),
//         ...filteredBleachers
//           .filter((b) => !alwaysInclude(b))
//           .sort((a, b) => a.bleacherNumber - b.bleacherNumber),
//       ]
//     : filteredBleachers.sort((a, b) => a.bleacherNumber - b.bleacherNumber);

//   // console.log("sortedBleachers", sortedBleachers);
//   // console.log("isFormExpanded", isFormExpanded);
//   return sortedBleachers;
// }

// export function getTodayLocation(bleacher: DashboardBleacher): AddressData | null {
//   const today = new Date();

//   const pastOrTodayEvents = bleacher.events.filter((e) => {
//     const start = new Date(e.eventStart);
//     return start <= today && e.addressData?.address;
//   });

//   if (pastOrTodayEvents.length === 0) return null;

//   // Find the event with the most recent start date that is not after today
//   const closestEvent = pastOrTodayEvents.reduce((latest, current) => {
//     const latestDate = new Date(latest.eventStart);
//     const currentDate = new Date(current.eventStart);
//     return currentDate > latestDate ? current : latest;
//   });

//   return closestEvent.addressData;
// }
