import { useDashboardBleachersStore } from "../../state/useDashboardBleachersStore";
import { useDashboardEventsStore } from "../../state/useDashboardEventsStore";
import { useDashboardAlertsStore } from "../../state/useDashboardAlertsStore";
import { useBleachers } from "./useBleachers";
import { useEvents } from "./useEvents";
import { useAlertsTable } from "./tables/useAlertsTable";

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
  const { data: alertRows, isLoading: alertsLoading } = useAlertsTable();

  try {
    useDashboardBleachersStore.getState().setData(bleachers);
    useDashboardBleachersStore.getState().setStale(false);
  } catch {}

  try {
    useDashboardEventsStore.getState().setData(events);
    useDashboardEventsStore.getState().setStale(false);
  } catch {}

  try {
    useDashboardAlertsStore.getState().setData(alertRows ?? []);
    useDashboardAlertsStore.getState().setStale(false);
  } catch {}

  return { bleachers, events, isLoading: bleachersLoading || eventsLoading || alertsLoading };
}
