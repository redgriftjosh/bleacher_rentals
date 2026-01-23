import { useDashboardBleachersStore } from "../../state/useDashboardBleachersStore";
import { useBleachers } from "./useBleachers";

export function useDashboardData() {
  const bleachers = useBleachers();
  try {
    useDashboardBleachersStore.getState().setData(bleachers);
    useDashboardBleachersStore.getState().setStale(false);
  } catch {}
}
