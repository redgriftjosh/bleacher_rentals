import { PROVINCES, STATES } from "@/types/Constants";
import { Bleacher, DashboardEvent } from "../dashboard/types";

export function filterSortPixiBleachers(
  homeBaseUuids: string[], // allowed summer home base uuids
  winterHomeBaseUuids: string[], // allowed winter home base uuids
  rows: number[], // allowed row counts
  bleachers: Bleacher[], // all bleachers (unfiltered, original order)
  alwaysIncludeBleacherUuids: string[], // ids to always include if form expanded
  isFormExpanded: boolean,
  optimizationMode: boolean,
  season: "SUMMER" | "WINTER" | null,
  summerAssignedBleacherUuids: string[] = [], // allowable bleachers if season === SUMMER
  winterAssignedBleacherUuids: string[] = [] // allowable bleachers if season === WINTER
): Bleacher[] {
  // console.log("filterSortPixiBleachers", {
  //   homeBaseIds,
  //   winterHomeBaseIds,
  //   rows,
  //   bleachers,
  //   alwaysIncludeBleacherIds,
  //   isFormExpanded,
  //   optimizationMode,
  //   season,
  //   summerAssignedBleacherIds,
  //   winterAssignedBleacherIds,
  // });
  // Fast lookups
  const summerHBSet = new Set(homeBaseUuids);
  const winterHBSet = new Set(winterHomeBaseUuids);
  const rowsSet = new Set(rows);
  const alwaysSet = new Set(alwaysIncludeBleacherUuids);
  const summerAssignSet = new Set(summerAssignedBleacherUuids);
  const winterAssignSet = new Set(winterAssignedBleacherUuids);

  // Map id -> bleacher and original index (to keep stable order later)
  const byUuid = new Map<string, Bleacher>();
  const indexOfUuid = new Map<string, number>();
  bleachers.forEach((b, i) => {
    byUuid.set(b.bleacherUuid, b);
    indexOfUuid.set(b.bleacherUuid, i);
  });

  // 1) Start with all; apply filters in order
  let filteredUuids: string[] = [];
  for (const b of bleachers) {
    // Summer home base filter
    const sid = b.summerHomeBase?.homeBaseUuid ?? null;
    if (!sid || !summerHBSet.has(sid)) continue;

    // Winter home base filter
    const wid = b.winterHomeBase?.homeBaseUuid ?? null;
    if (!wid || !winterHBSet.has(wid)) continue;

    // Rows filter
    if (!rowsSet.has(b.bleacherRows)) continue;

    // Season filter (use assigned lists when provided)
    if (season === "SUMMER") {
      if (!summerAssignSet.has(b.bleacherUuid)) continue;
    }
    if (season === "WINTER") {
      if (!winterAssignSet.has(b.bleacherUuid)) continue;
    }

    filteredUuids.push(b.bleacherUuid);
  }

  // 2) Ensure always-include IDs are present when form expanded OR optimization mode is ON
  // In optimization mode we include them but do not promote them to the top (ordering handled below)
  if (isFormExpanded || optimizationMode) {
    const present = new Set(filteredUuids);
    for (const id of alwaysSet) {
      if (!present.has(id) && byUuid.has(id)) {
        filteredUuids.push(id);
        present.add(id);
      }
    }
  }

  // 3) Return in the right order
  // Default: keep original order of incoming array for stability.
  // If form expanded AND NOT optimizationMode, move always-include to the top (still stable).
  const finalSet = new Set(filteredUuids);

  // If optimization mode is OFF, promote always-includes to the top (regardless of form expansion)
  if (!optimizationMode) {
    // Always-includes first (in original order), then the rest (in original order)
    const top: Bleacher[] = [];
    const rest: Bleacher[] = [];

    for (const b of bleachers) {
      if (!finalSet.has(b.bleacherUuid)) continue;
      if (alwaysSet.has(b.bleacherUuid)) top.push(b);
      else rest.push(b);
    }
    return [...top, ...rest];
  }

  // Otherwise: keep original order for everything (including reinserted always-includes)
  const result: Bleacher[] = [];
  for (const b of bleachers) {
    if (finalSet.has(b.bleacherUuid)) result.push(b);
  }
  // console.log("filterSortPixiBleachers result", result);
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
