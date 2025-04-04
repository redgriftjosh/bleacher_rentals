// import { apiListAllBleachersWithEvents } from "@/functions/api/bleachers";
// import { DateTime } from "luxon";
// import { convertToLocalString, convertToUTCString } from "@/functions/util";
// import { CreateEventPayload } from "../../_lib/interfaces";
// import { apiCreateEvent } from "../../_lib/api";
// import { calculateLeftAndWidthPercent } from "../../_lib/functions";

// export interface Event {
//   eventName: string;
//   eventStart: string; // ISO date string UTC
//   eventEnd: string; // ISO date string UTC
//   eventDuration: number; // in days
//   setupStart: string; // ISO date string UTC
//   setupEnd: string; // ISO date string UTC
//   setupDuration: number; // in days
//   teardownStart: string; // ISO date string UTC
//   teardownEnd: string; // ISO date string UTC
//   teardownDuration: number; // in days
//   storeBeforeStart: string | null; // ISO date string UTC
//   storeBeforeEnd: string | null; // ISO date string UTC
//   storeBeforeDuration: number; // in days
//   storeAfterStart: string | null; // ISO date string UTC
//   storeAfterEnd: string | null; // ISO date string UTC
//   storeAfterDuration: number; // in days
// }

// // this is the interface for what the fronend needs to display it
// export interface Bleacher {
//   bleacherId: number;
//   bleacherNumber: number;
//   rows: number;
//   seats: number;
//   homeBase: string;
//   events: Event[];
// }

// function convertBleachersEventsUTCDatesToLocalString(bleachers: any[]): any[] {
//   return bleachers.map((bleacher) => {
//     return {
//       ...bleacher,
//       events: bleacher.events.map((event: any) => {
//         const { width: eventWidth, left: eventLeft } = calculateLeftAndWidthPercent(
//           event.eventStart,
//           event.eventEnd,
//         );
//         const { width: setupWidth, left: setupLeft } = calculateLeftAndWidthPercent(
//           event.setupStart,
//           event.setupEnd,
//         );
//         const { width: teardownWidth, left: teardownLeft } = calculateLeftAndWidthPercent(
//           event.teardownStart,
//           event.teardownEnd,
//         );
//         const { width: storeBeforeWidth, left: storeBeforeLeft } =
//           event.storeBeforeStart && event.storeBeforeEnd
//             ? calculateLeftAndWidthPercent(event.storeBeforeStart, event.storeBeforeEnd)
//             : { width: "0%", left: "0%" };
//         const { width: storeAfterWidth, left: storeAfterLeft } =
//           event.storeAfterStart && event.storeAfterEnd
//             ? calculateLeftAndWidthPercent(event.storeAfterStart, event.storeAfterEnd)
//             : { width: "0%", left: "0%" };

//         const convertedEvent: any = {
//           ...event,
//           eventStart: convertToLocalString(event.eventStart),
//           eventEnd: convertToLocalString(event.eventEnd),
//           eventWidth: eventWidth,
//           eventLeft: eventLeft,
//           setupStart: convertToLocalString(event.setupStart),
//           setupEnd: convertToLocalString(event.setupEnd),
//           setupWidth: setupWidth,
//           setupLeft: setupLeft,
//           teardownStart: convertToLocalString(event.teardownStart),
//           teardownEnd: convertToLocalString(event.teardownEnd),
//           teardownWidth: teardownWidth,
//           teardownLeft: teardownLeft,
//           storeBeforeStart: event.storeBeforeStart
//             ? convertToLocalString(event.storeBeforeStart)
//             : null,
//           storeBeforeEnd: event.storeBeforeEnd ? convertToLocalString(event.storeBeforeEnd) : null,
//           storeBeforeWidth: storeBeforeWidth,
//           storeBeforeLeft: storeBeforeLeft,
//           storeAfterStart: event.storeAfterStart
//             ? convertToLocalString(event.storeAfterStart)
//             : null,
//           storeAfterEnd: event.storeAfterEnd ? convertToLocalString(event.storeAfterEnd) : null,
//           storeAfterWidth: storeAfterWidth,
//           storeAfterLeft: storeAfterLeft,
//         };
//         return convertedEvent;
//       }),
//     };
//   });
// }

// export async function fetchBleachersWithEvents() {
//   try {
//     const result = (await apiListAllBleachersWithEvents()) as any[];
//     // console.log("apiListAllBleachersWithEvents: ", result);
//     const localBleachers = convertBleachersEventsUTCDatesToLocalString(result);
//     // console.log("localBleachers: ", localBleachers);
//     return localBleachers as any[];
//   } catch (error) {
//     console.error("Error fetching bleachers:", error);
//     return null;
//   }
// }

// const mockCreateEventPayload: CreateEventPayload = {
//   eventName: "Spring Festival",
//   address: {
//     street: "123 Market Street",
//     city: "Springfield",
//     stateProvince: "IL",
//     zipPostal: "62701",
//   },
//   bleacherIds: [11, 12, 15],
//   eventStart: "2025-05-01T14:00:00.000Z",
//   eventEnd: "2025-05-01T20:00:00.000Z",
//   setupStart: "2025-05-01T10:00:00.000Z",
//   setupEnd: "2025-05-01T12:00:00.000Z",
//   teardownStart: "2025-05-01T20:00:00.000Z",
//   teardownEnd: "2025-05-01T22:00:00.000Z",
//   storeBeforeStart: "2025-04-30T08:00:00.000Z",
//   storeBeforeEnd: "2025-04-30T18:00:00.000Z",
//   storeAfterStart: "2025-05-02T08:00:00.000Z",
//   storeAfterEnd: "2025-05-02T12:00:00.000Z",
// };

// export default mockCreateEventPayload;

// export async function createEventMock() {
//   try {
//     // Call API with new format
//     await apiCreateEvent(mockCreateEventPayload);
//   } catch (err) {
//     console.error("Error creating event:", err);
//     return new Error("Failed to create event. Please try again.");
//   }
// }
