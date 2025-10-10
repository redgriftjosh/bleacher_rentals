import { Bleacher } from "../../dashboard/db/client/bleachers";
import { getHomeBaseIdByName } from "@/utils/utils";

/**
 * Filters and sorts Pixi Bleachers using the same semantics as filterSortBleachers
 * in the legacy React dashboard, but adapted to the simpler Bleacher shape here.
 * We only have summerHomeBase & winterHomeBase names (strings), so we map them to ids.
 */
export function filterSortPixiBleachers(
  homeBaseIds: number[],
  winterHomeBaseIds: number[],
  rows: number[],
  bleachers: Bleacher[],
  alwaysIncludeBleacherIds: number[],
  isFormExpanded: boolean,
  optimizationMode: boolean
): Bleacher[] {
  // If filters haven't been initialized yet, show all bleachers in a stable order.
  const filtersReady = homeBaseIds.length > 0 && winterHomeBaseIds.length > 0 && rows.length > 0;
  if (!filtersReady) {
    return [...bleachers].sort((a, b) => a.bleacherNumber - b.bleacherNumber);
  }
  const matchesFilter = (b: Bleacher) => {
    const summerId = getHomeBaseIdByName(b.summerHomeBase) ?? -1;
    const winterId = getHomeBaseIdByName(b.winterHomeBase) ?? -1;
    return (
      homeBaseIds.includes(summerId) &&
      winterHomeBaseIds.includes(winterId) &&
      rows.includes(b.bleacherRows)
    );
  };

  const alwaysInclude = (b: Bleacher) => alwaysIncludeBleacherIds.includes(b.bleacherId);

  // When optimizationMode is ON, selection should not affect inclusion or ordering.
  // We also want the rows to sit in their "normal" places (by bleacherNumber).
  if (optimizationMode) {
    return bleachers.filter(matchesFilter).sort((a, b) => a.bleacherNumber - b.bleacherNumber);
  }

  const filtered = isFormExpanded
    ? bleachers.filter((b) => matchesFilter(b) || alwaysInclude(b))
    : bleachers.filter(matchesFilter);

  const selected = filtered
    .filter(alwaysInclude)
    .sort((a, b) => a.bleacherNumber - b.bleacherNumber);
  const rest = filtered
    .filter((b) => !alwaysInclude(b))
    .sort((a, b) => a.bleacherNumber - b.bleacherNumber);

  return isFormExpanded
    ? [...selected, ...rest]
    : rest.concat(selected).sort((a, b) => a.bleacherNumber - b.bleacherNumber);
}
