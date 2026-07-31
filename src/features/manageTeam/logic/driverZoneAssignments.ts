/**
 * Computes DriverZones rows to add/remove when saving from the driver profile.
 * Account managers may only change assignments for zones they manage; other zones are preserved.
 */
export function computeDriverZoneAssignmentChanges(params: {
  selectedZoneUuids: string[];
  existingZoneUuids: string[];
  /** null = admin — full replace within selected vs existing */
  manageableZoneUuids: string[] | null;
}): { toAdd: string[]; toRemove: string[] } {
  const { selectedZoneUuids, existingZoneUuids, manageableZoneUuids } = params;

  if (manageableZoneUuids === null) {
    const selected = new Set(selectedZoneUuids);
    return {
      toAdd: selectedZoneUuids.filter((z) => !existingZoneUuids.includes(z)),
      toRemove: existingZoneUuids.filter((z) => !selected.has(z)),
    };
  }

  const manageable = new Set(manageableZoneUuids);
  const selectedInScope = selectedZoneUuids.filter((z) => manageable.has(z));
  const existingInScope = existingZoneUuids.filter((z) => manageable.has(z));

  return {
    toAdd: selectedInScope.filter((z) => !existingInScope.includes(z)),
    toRemove: existingInScope.filter((z) => !selectedInScope.includes(z)),
  };
}

/** Merges multi-select changes for an AM (only zones they can manage). */
export function mergeDriverZoneSelection(params: {
  currentAssignedZoneUuids: string[];
  manageableZoneUuids: string[];
  selectedManageableZoneUuids: string[];
}): string[] {
  const manageable = new Set(params.manageableZoneUuids);
  const preserved = params.currentAssignedZoneUuids.filter((z) => !manageable.has(z));
  const selected = params.selectedManageableZoneUuids.filter((z) => manageable.has(z));
  return [...new Set([...preserved, ...selected])];
}
