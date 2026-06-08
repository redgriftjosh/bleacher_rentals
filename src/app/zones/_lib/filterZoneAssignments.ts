import { ZoneBleacherOption } from "./hooks/useZoneBleachers";

export function isBleacherAvailableForZone(
  bleacher: ZoneBleacherOption,
  currentZoneUuid: string | null | undefined,
  selectedBleacherUuids: string[],
): boolean {
  if (!bleacher.zoneUuid) return true;
  if (bleacher.zoneUuid === currentZoneUuid) return true;
  if (selectedBleacherUuids.includes(bleacher.bleacherUuid)) return true;
  return false;
}
