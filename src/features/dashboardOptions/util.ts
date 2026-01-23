import { PROVINCES, STATES } from "@/types/Constants";
import { Bleacher, DashboardEvent } from "../dashboard/types";

type BleacherFilterSortOptions = {
  // allowed home base uuids
  summerHomeBaseUuids: string[];
  winterHomeBaseUuids: string[];

  // allowed row counts
  rows: number[];

  // null = all bleachers
  season: "SUMMER" | "WINTER" | null;

  // only applied when season is SUMMER/WINTER
  accountManagerUuid?: string | null;

  // ids to always include when expanded/optimizing
  alwaysIncludeBleacherUuids: string[];
  isFormExpanded: boolean;
  optimizationMode: boolean;
};

export function filterSortPixiBleachers(
  bleachers: Bleacher[],
  opts: BleacherFilterSortOptions
): Bleacher[] {
  const {
    summerHomeBaseUuids,
    winterHomeBaseUuids,
    rows,
    season,
    accountManagerUuid,
    alwaysIncludeBleacherUuids,
    isFormExpanded,
    optimizationMode,
  } = opts;

  const summerHBSet = summerHomeBaseUuids.length > 0 ? new Set(summerHomeBaseUuids) : null;
  const winterHBSet = winterHomeBaseUuids.length > 0 ? new Set(winterHomeBaseUuids) : null;
  const rowsSet = rows.length > 0 ? new Set(rows) : null;
  const alwaysSet = new Set(alwaysIncludeBleacherUuids);

  const passesSeasonFilters = (b: Bleacher): boolean => {
    // Rows filter (always applies)
    if (rowsSet && !rowsSet.has(b.bleacherRows)) return false;

    // Season-specific home base filter
    if (season === "SUMMER") {
      const sid = b.summerHomeBase?.homeBaseUuid ?? null;
      if (!sid) return false;
      if (summerHBSet && !summerHBSet.has(sid)) return false;

      if (accountManagerUuid) {
        if (b.summerAccountManagerUuid !== accountManagerUuid) return false;
      }

      return true;
    }

    if (season === "WINTER") {
      const wid = b.winterHomeBase?.homeBaseUuid ?? null;
      if (!wid) return false;
      if (winterHBSet && !winterHBSet.has(wid)) return false;

      if (accountManagerUuid) {
        if (b.winterAccountManagerUuid !== accountManagerUuid) return false;
      }

      return true;
    }

    // season === null (all bleachers)
    // Apply both home base filters (when present) and *never* apply account manager filtering.
    const sid = b.summerHomeBase?.homeBaseUuid ?? null;
    if (!sid) return false;
    if (summerHBSet && !summerHBSet.has(sid)) return false;

    const wid = b.winterHomeBase?.homeBaseUuid ?? null;
    if (!wid) return false;
    if (winterHBSet && !winterHBSet.has(wid)) return false;

    return true;
  };

  // 1) Filter bleachers (stable)
  const included = new Set<string>();
  for (const b of bleachers) {
    if (!passesSeasonFilters(b)) continue;
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
