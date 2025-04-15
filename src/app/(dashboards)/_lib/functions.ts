// import { convertToLocalString, convertToUTCString } from "@/functions/util";
// import { apiCreateEvent, apiDeleteEvent, apiGetEventById, apiUpdateEvent } from "./api";
// import { CreateEventPayload } from "./interfaces";
// import { DateTime } from "luxon";

// function convertEventDatesToLocalString(event: any) {
//   return {
//     ...event,
//     eventStart: convertToLocalString(event.eventStart),
//     eventEnd: convertToLocalString(event.eventEnd),
//     setupStart: convertToLocalString(event.setupStart),
//     setupEnd: convertToLocalString(event.setupEnd),
//     teardownStart: convertToLocalString(event.teardownStart),
//     teardownEnd: convertToLocalString(event.teardownEnd),
//     storeBeforeStart: event.storeBeforeStart ? convertToLocalString(event.storeBeforeStart) : null,
//     storeBeforeEnd: event.storeBeforeEnd ? convertToLocalString(event.storeBeforeEnd) : null,
//     storeAfterStart: event.storeAfterStart ? convertToLocalString(event.storeAfterStart) : null,
//     storeAfterEnd: event.storeAfterEnd ? convertToLocalString(event.storeAfterEnd) : null,
//   };
// }

// export function calculateLeftAndWidthPercent(startString: string, endString: string) {
//   // Convert to Luxon DateTime (assuming stored as UTC)
//   const startDate = DateTime.fromFormat(startString, "yyyy-MM-dd HH:mm:ss", {
//     zone: "utc",
//   }).setZone("local");
//   const endDate = DateTime.fromFormat(endString, "yyyy-MM-dd HH:mm:ss", { zone: "utc" }).setZone(
//     "local",
//   );

//   // Total event duration in hours
//   const eventDurationHours = endDate.diff(startDate, "hours").hours;

//   // Calculate width: (event duration / 12 hours) * 100%
//   const widthPercentage = (eventDurationHours / 24) * 100;

//   // Get the hour & minute of the start time
//   const startHour = startDate.hour;
//   const startMinute = startDate.minute;

//   // Convert event start time to decimal hours (e.g., 02:24 => 2.4 hours)
//   const startDecimalHours = startHour + startMinute / 60;

//   // Calculate left: (event start time / 24 hours) * 100%
//   const leftPercentage = (startDecimalHours / 24) * 100;

//   return {
//     width: `${Math.round(widthPercentage)}%`,
//     left: `${Math.round(leftPercentage)}%`,
//   };
// }

// export async function fetchEventById(eventId: number) {
//   try {
//     const result = (await apiGetEventById(eventId)) as any;
//     // console.log("apiGetEventById: ", result);
//     const formattedResult = convertEventDatesToLocalString(result);
//     // console.log("formattedResult: ", formattedResult);
//     return formattedResult as any;
//   } catch (err) {
//     console.error("Error fetching event:", err);
//     return null;
//   }
// }

// export async function createUpdateEvent(createEventPayload: CreateEventPayload) {
//   try {
//     // Validate dates
//     if (new Date(createEventPayload.eventEnd) <= new Date(createEventPayload.eventStart)) {
//       return new Error("End date must be after start date");
//     }

//     const eventPayload: CreateEventPayload = {
//       eventId: createEventPayload.eventId,
//       addressId: createEventPayload.addressId,
//       eventName: createEventPayload.eventName,
//       address: createEventPayload.address,
//       bleacherIds: createEventPayload.bleacherIds,
//       eventStart: convertToUTCString(createEventPayload.eventStart),
//       eventEnd: convertToUTCString(createEventPayload.eventEnd),
//       setupStart: convertToUTCString(createEventPayload.setupStart),
//       setupEnd: convertToUTCString(createEventPayload.setupEnd),
//       teardownStart: convertToUTCString(createEventPayload.teardownStart),
//       teardownEnd: convertToUTCString(createEventPayload.teardownEnd),
//       storeBeforeStart: createEventPayload.storeBeforeStart
//         ? convertToUTCString(createEventPayload.storeBeforeStart!)
//         : null,
//       storeBeforeEnd: createEventPayload.storeBeforeStart
//         ? convertToUTCString(createEventPayload.storeBeforeEnd!)
//         : null,
//       storeAfterStart: createEventPayload.storeBeforeStart
//         ? convertToUTCString(createEventPayload.storeAfterStart!)
//         : null,
//       storeAfterEnd: createEventPayload.storeBeforeStart
//         ? convertToUTCString(createEventPayload.storeAfterEnd!)
//         : null,
//       rowsPerBleacher: createEventPayload.rowsPerBleacher ? createEventPayload.rowsPerBleacher : -1,
//       seatsTotal: createEventPayload.seatsTotal ? createEventPayload.seatsTotal : -1,
//       bleacherCount: createEventPayload.bleacherCount ? createEventPayload.bleacherCount : -1,
//     };

//     if (createEventPayload.eventId && createEventPayload.addressId) {
//       console.log("Updating event:", eventPayload);
//       await apiUpdateEvent(eventPayload);
//     } else {
//       console.log("Creating event:", eventPayload);
//       await apiCreateEvent(eventPayload);
//     }
//   } catch (err) {
//     console.error("Error create/update event:", err);
//     return new Error("Failed to create/update event. Please try again.");
//   }
// }

// export async function deleteEvent(eventId: number) {
//   try {
//     await apiDeleteEvent(eventId);
//   } catch (err) {
//     console.error("Error deleting event:", err);
//     return new Error("Failed to delete event. Please try again.");
//   }
// }
