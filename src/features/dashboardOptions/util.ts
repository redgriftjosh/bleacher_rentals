import { PROVINCES, STATES } from "@/types/Constants";
import { Bleacher, DashboardEvent } from "../dashboard/types";

export function filterSortPixiBleachers(
  homeBaseIds: number[], // allowed summer home base ids
  winterHomeBaseIds: number[], // allowed winter home base ids
  rows: number[], // allowed row counts
  bleachers: Bleacher[], // all bleachers (unfiltered, original order)
  alwaysIncludeBleacherIds: number[], // ids to always include if form expanded
  isFormExpanded: boolean,
  optimizationMode: boolean,
  season: "SUMMER" | "WINTER" | null,
  summerAssignedBleacherIds: number[] = [], // allowable bleachers if season === SUMMER
  winterAssignedBleacherIds: number[] = [] // allowable bleachers if season === WINTER
): Bleacher[] {
  console.log("filterSortPixiBleachers", {
    homeBaseIds,
    winterHomeBaseIds,
    rows,
    bleachers,
    alwaysIncludeBleacherIds,
    isFormExpanded,
    optimizationMode,
    season,
    summerAssignedBleacherIds,
    winterAssignedBleacherIds,
  });
  // Fast lookups
  const summerHBSet = new Set(homeBaseIds);
  const winterHBSet = new Set(winterHomeBaseIds);
  const rowsSet = new Set(rows);
  const alwaysSet = new Set(alwaysIncludeBleacherIds);
  const summerAssignSet = new Set(summerAssignedBleacherIds);
  const winterAssignSet = new Set(winterAssignedBleacherIds);

  // Map id -> bleacher and original index (to keep stable order later)
  const byId = new Map<number, Bleacher>();
  const indexOfId = new Map<number, number>();
  bleachers.forEach((b, i) => {
    byId.set(b.bleacherId, b);
    indexOfId.set(b.bleacherId, i);
  });

  // 1) Start with all; apply filters in order
  let filteredIds: number[] = [];
  for (const b of bleachers) {
    // Summer home base filter
    const sid = b.summerHomeBase?.id ?? null;
    if (!sid || !summerHBSet.has(sid)) continue;

    // Winter home base filter
    const wid = b.winterHomeBase?.id ?? null;
    if (!wid || !winterHBSet.has(wid)) continue;

    // Rows filter
    if (!rowsSet.has(b.bleacherRows)) continue;

    // Season filter (use assigned lists when provided)
    if (season === "SUMMER") {
      if (!summerAssignSet.has(b.bleacherId)) continue;
    }
    if (season === "WINTER") {
      if (!winterAssignSet.has(b.bleacherId)) continue;
    }

    filteredIds.push(b.bleacherId);
  }

  // 2) Ensure always-include IDs are present when form expanded OR optimization mode is ON
  // In optimization mode we include them but do not promote them to the top (ordering handled below)
  if (isFormExpanded || optimizationMode) {
    const present = new Set(filteredIds);
    for (const id of alwaysSet) {
      if (!present.has(id) && byId.has(id)) {
        filteredIds.push(id);
        present.add(id);
      }
    }
  }

  // 3) Return in the right order
  // Default: keep original order of incoming array for stability.
  // If form expanded AND NOT optimizationMode, move always-include to the top (still stable).
  const finalSet = new Set(filteredIds);

  // If optimization mode is OFF, promote always-includes to the top (regardless of form expansion)
  if (!optimizationMode) {
    // Always-includes first (in original order), then the rest (in original order)
    const top: Bleacher[] = [];
    const rest: Bleacher[] = [];

    for (const b of bleachers) {
      if (!finalSet.has(b.bleacherId)) continue;
      if (alwaysSet.has(b.bleacherId)) top.push(b);
      else rest.push(b);
    }
    return [...top, ...rest];
  }

  // Otherwise: keep original order for everything (including reinserted always-includes)
  const result: Bleacher[] = [];
  for (const b of bleachers) {
    if (finalSet.has(b.bleacherId)) result.push(b);
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
