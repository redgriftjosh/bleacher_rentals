import { PROVINCES, STATES } from "@/types/Constants";
import { Bleacher, DashboardEvent } from "../dashboard/types";

type BleacherFilterSortOptions = {
  // allowed row counts
  rows: number[];

  // ids to always include when expanded/optimizing
  alwaysIncludeBleacherUuids: string[];
  isFormExpanded: boolean;
  optimizationMode: boolean;
};

export function filterSortPixiBleachers(
  bleachers: Bleacher[],
  opts: BleacherFilterSortOptions,
): Bleacher[] {
  const { rows, alwaysIncludeBleacherUuids, isFormExpanded, optimizationMode } = opts;

  const rowsSet = rows.length > 0 ? new Set(rows) : null;
  const alwaysSet = new Set(alwaysIncludeBleacherUuids);

  // 1) Filter bleachers by rows
  const included = new Set<string>();
  for (const b of bleachers) {
    if (rowsSet && !rowsSet.has(b.bleacherRows)) continue;
    included.add(b.bleacherUuid);
  }

  // 2) Ensure always-include IDs are present when form expanded OR optimization mode is ON.
  if (isFormExpanded || optimizationMode) {
    for (const id of alwaysSet) {
      included.add(id);
    }
  }

  // 3) Stable ordering + promotion rules
  if (!optimizationMode) {
    const top: Bleacher[] = [];
    const rest: Bleacher[] = [];

    for (const b of bleachers) {
      if (!included.has(b.bleacherUuid)) continue;
      if (alwaysSet.has(b.bleacherUuid)) top.push(b);
      else rest.push(b);
    }

    return [...top, ...rest];
  }

  const result: Bleacher[] = [];
  for (const b of bleachers) {
    if (included.has(b.bleacherUuid)) result.push(b);
  }
  return result;
}

export function filterEvents(events: DashboardEvent[], stateProvinces: number[]): DashboardEvent[] {
  const allStatesAndProvinces = [...STATES, ...PROVINCES];

  return events.filter((event) => {
    const state = event.addressData?.state;
    if (!state) return false;

    const index = allStatesAndProvinces.indexOf(state);
    return stateProvinces.includes(index);
  });
}
