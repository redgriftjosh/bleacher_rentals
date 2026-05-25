import { useDashboardBleachersStore } from "../../state/useDashboardBleachersStore";
import { useDashboardEventsStore } from "../../state/useDashboardEventsStore";
import { useBleachers } from "./useBleachers";
import { useEvents } from "./useEvents";

export function useDashboardData(opts?: {
  onlyMine?: boolean;
  userUuid?: string | null;
}): {
  bleachers: ReturnType<typeof useBleachers>["bleachers"];
  events: ReturnType<typeof useEvents>["events"];
  isLoading: boolean;
} {
  const { bleachers, isLoading: bleachersLoading } = useBleachers();
  const { events, isLoading: eventsLoading } = useEvents(opts);

  try {
    useDashboardBleachersStore.getState().setData(bleachers);
    useDashboardBleachersStore.getState().setStale(false);
  } catch {}

  try {
    useDashboardEventsStore.getState().setData(events);
    useDashboardEventsStore.getState().setStale(false);
  } catch {}

  return { bleachers, events, isLoading: bleachersLoading || eventsLoading };
}
