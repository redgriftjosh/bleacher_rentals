import { useWorkTrackersStore } from "@/state/workTrackersStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { Tables } from "../../../../../../../database.types";

export function getWorkTracker(
  bleacherEventId: number,
  type: "setup" | "teardown"
): Tables<"WorkTrackers"> | null {
  const workTrackers = useWorkTrackersStore.getState().workTrackers;
  const bleacherEvent = useBleacherEventsStore
    .getState()
    .bleacherEvents.find((be) => be.bleacher_event_id === bleacherEventId);

  const workTrackerId =
    type === "setup"
      ? bleacherEvent?.setup_work_tracker_id
      : bleacherEvent?.teardown_work_tracker_id;

  if (!workTrackerId) {
    return null;
  }

  const workTracker = workTrackers.find((wt) => wt.work_tracker_id === workTrackerId);

  if (!workTracker) {
    return null;
  }

  return workTracker;
}
