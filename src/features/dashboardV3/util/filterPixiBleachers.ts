import { Bleacher } from "../../dashboard/db/client/bleachers";
import { getHomeBaseIdByName } from "@/utils/utils";

/**
 * Filters and sorts Pixi Bleachers using the same semantics as filterSortBleachers
 * in the legacy React dashboard, but adapted to the simpler Bleacher shape here.
 * We only have summerHomeBase & winterHomeBase names (strings), so we map them to ids.
 */
// export function filterSortPixiBleachers(
//   homeBaseIds: number[],
//   winterHomeBaseIds: number[],
//   rows: number[],
//   bleachers: Bleacher[],
//   alwaysIncludeBleacherIds: number[],
//   isFormExpanded: boolean,
//   optimizationMode: boolean,
//   season: "SUMMER" | "WINTER" | null,
//   summerAssignedBleacherIds: number[] = [],
//   winterAssignedBleacherIds: number[] = []
// ): Bleacher[] {
//   console.log("filterSortPixiBleachers", {
//     homeBaseIds,
//     winterHomeBaseIds,
//     rows,
//     bleachers,
//     alwaysIncludeBleacherIds,
//     isFormExpanded,
//     optimizationMode,
//     season,
//     summerAssignedBleacherIds,
//     winterAssignedBleacherIds,
//   });
//   // If filters haven't been initialized yet, show all bleachers in a stable order.
//   // Treat empty rows as an intentional filter (show nothing). Only guard on home base filters
//   // to allow the first-load experience to show data before filters are initialized.
//   const summerReady = homeBaseIds.length > 0;
//   const winterReady = winterHomeBaseIds.length > 0;
//   const filtersReady = summerReady && winterReady;
//   if (!filtersReady) {
//     // Before filters initialize, still respect Season assignment so first load doesn't show everything
//     if (season === "SUMMER") {
//       return bleachers
//         .filter((b) => summerAssignedBleacherIds.includes(b.bleacherId))
//         .sort((a, b) => a.bleacherNumber - b.bleacherNumber);
//     }
//     if (season === "WINTER") {
//       return bleachers
//         .filter((b) => winterAssignedBleacherIds.includes(b.bleacherId))
//         .sort((a, b) => a.bleacherNumber - b.bleacherNumber);
//     }
//     return [...bleachers].sort((a, b) => a.bleacherNumber - b.bleacherNumber);
//   }
//   const matchesFilter = (b: Bleacher) => {
//     const summerId = getHomeBaseIdByName(b.summerHomeBase) ?? -1;
//     const winterId = getHomeBaseIdByName(b.winterHomeBase) ?? -1;
//     // Season gate: if a season is selected, bleacher must be assigned to the user for that season
//     const assignmentOk =
//       season === "SUMMER"
//         ? summerAssignedBleacherIds.includes(b.bleacherId)
//         : season === "WINTER"
//         ? winterAssignedBleacherIds.includes(b.bleacherId)
//         : true; // Don't Filter

//     // Keep existing home base + rows filters
//     const homeBaseOk =
//       season === "SUMMER"
//         ? homeBaseIds.includes(summerId)
//         : season === "WINTER"
//         ? winterHomeBaseIds.includes(winterId)
//         : homeBaseIds.includes(summerId) && winterHomeBaseIds.includes(winterId);

//     return assignmentOk && homeBaseOk && rows.includes(b.bleacherRows);
//   };

//   const alwaysInclude = (b: Bleacher) => alwaysIncludeBleacherIds.includes(b.bleacherId);

//   // When optimizationMode is ON, selection should not affect inclusion or ordering.
//   // We also want the rows to sit in their "normal" places (by bleacherNumber).
//   if (optimizationMode) {
//     return bleachers.filter(matchesFilter).sort((a, b) => a.bleacherNumber - b.bleacherNumber);
//   }

//   const filtered = isFormExpanded
//     ? bleachers.filter((b) => matchesFilter(b) || alwaysInclude(b))
//     : bleachers.filter(matchesFilter);

//   const selected = filtered
//     .filter(alwaysInclude)
//     .sort((a, b) => a.bleacherNumber - b.bleacherNumber);
//   const rest = filtered
//     .filter((b) => !alwaysInclude(b))
//     .sort((a, b) => a.bleacherNumber - b.bleacherNumber);

//   return isFormExpanded
//     ? [...selected, ...rest]
//     : rest.concat(selected).sort((a, b) => a.bleacherNumber - b.bleacherNumber);
// }

export function filterSortPixiBleachersV2(
  homeBaseIds: number[],
  winterHomeBaseIds: number[],
  rows: number[],
  bleachers: Bleacher[],
  alwaysIncludeBleacherIds: number[],
  isFormExpanded: boolean,
  optimizationMode: boolean,
  season: "SUMMER" | "WINTER" | null,
  summerAssignedBleacherIds: number[] = [],
  winterAssignedBleacherIds: number[] = []
): Bleacher[] {
  let b = bleachers;
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

  const alwaysIncludedBleachers = bleachers.filter((b) =>
    alwaysIncludeBleacherIds.includes(b.bleacherId)
  );

  // remove always included from b
  b = b.filter((b) => !alwaysIncludeBleacherIds.includes(b.bleacherId));

  // only include assigned bleacher for this season
  if (season === "SUMMER") {
    console.log("summerAssignedBleacherIds", summerAssignedBleacherIds);
    b.filter((b) => summerAssignedBleacherIds.includes(b.bleacherId));
  }
  if (season === "WINTER") {
    b.filter((b) => winterAssignedBleacherIds.includes(b.bleacherId));
  }

  // filter by summerHomeBase each of the selected home bases must containt the bleachers home base id
  b.filter((b) => homeBaseIds.includes(b.summerHomeBase?.id ?? -1));
  b.filter((b) => winterHomeBaseIds.includes(b.winterHomeBase?.id ?? -1));

  b.filter((b) => rows.includes(b.bleacherRows));

  const sorted = b.sort((a, b) => a.bleacherNumber - b.bleacherNumber);
  console.log("sorted", sorted);

  // return b plus alwaysIncluded
  return [...alwaysIncludedBleachers, ...sorted];
}

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

  // 2) If form expanded, ensure always-include IDs are present (override filters)
  if (isFormExpanded) {
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

  if (isFormExpanded && !optimizationMode) {
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
  console.log("filterSortPixiBleachers result", result);
  return result;
}
