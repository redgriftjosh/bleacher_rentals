// import { useEventsStore } from "@/state/eventsStore";
// import { SetupTeardownBlock } from "../../_components/dashboard/SetupTeardownBlockModal";
// import { useBleacherEventsStore } from "@/state/bleacherEventStore";
// import { createErrorToast } from "@/components/toasts/ErrorToast";

// export function getDefaultDate(selectedBlock: SetupTeardownBlock): string {
//   const bleacherEvent = useBleacherEventsStore
//     .getState()
//     .bleacherEvents.find((be) => be.id === selectedBlock.bleacherEventUuid);
//   if (!bleacherEvent) createErrorToast(["Failed to find bleacher event for block"]);
//   const event = useEventsStore.getState().events.find((e) => e.id === bleacherEvent?.event_uuid);
//   if (!event) createErrorToast(["Failed to find event for block"]);
//   return selectedBlock.type === "setup"
//     ? event.setup_start ?? event.event_start
//     : event.teardown_end ?? event.event_end;
// }
