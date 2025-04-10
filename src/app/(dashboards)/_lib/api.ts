// import { getTokenContainedHeader } from "@/functions/cognito";
// import { CreateEventPayload } from "./interfaces";
// import axios from "axios";

// export async function apiGetEventById(eventId: number) {
//   const headers = await getTokenContainedHeader();
//   const result = (
//     await axios.get(process.env.NEXT_PUBLIC_API_URL + `/events/${eventId}`, {
//       headers,
//     })
//   ).data;

//   return result;
// }

// export async function apiUpdateEvent(eventPayload: CreateEventPayload) {
//   const headers = await getTokenContainedHeader();
//   // const { eventName, bleacherIds, eventStart, eventEnd } = eventPayload;
//   await axios.put(process.env.NEXT_PUBLIC_API_URL + "/events", eventPayload, {
//     headers,
//   });
// }

// export async function apiCreateEvent(eventPayload: CreateEventPayload) {
//   const headers = await getTokenContainedHeader();
//   // const { eventName, bleacherIds, eventStart, eventEnd } = eventPayload;
//   await axios.post(process.env.NEXT_PUBLIC_API_URL + "/events", eventPayload, {
//     headers,
//   });
// }

// export async function apiDeleteEvent(eventId: number) {
//   const headers = await getTokenContainedHeader();
//   await axios.delete(process.env.NEXT_PUBLIC_API_URL + `/events/${eventId}`, {
//     headers,
//   });
// }
