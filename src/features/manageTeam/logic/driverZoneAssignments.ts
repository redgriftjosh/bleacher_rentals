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

/**
 * Folds a driver-tab zone edit (the add/remove diff just applied via
 * syncDriverZoneAssignments) into the AM's per-zone driver map, so a later
 * full delete+reinsert sync of that map (syncDriverZonesForAm) reproduces
 * the driver-tab edit instead of clobbering it with the stale snapshot the
 * map was loaded with. One-directional: reflects driver-tab changes into the
 * map only, does not resolve conflicts coming from the AM-grid side.
 */
export function reconcileZoneDriverMap(params: {
  zoneDriverMap: Record<string, string[]>;
  driverUuid: string;
  addedZoneUuids: string[];
  removedZoneUuids: string[];
}): Record<string, string[]> {
  const { zoneDriverMap, driverUuid, addedZoneUuids, removedZoneUuids } = params;
  const next: Record<string, string[]> = Object.fromEntries(
    Object.entries(zoneDriverMap).map(([zoneUuid, driverUuids]) => [zoneUuid, [...driverUuids]]),
  );

  for (const zoneUuid of removedZoneUuids) {
    if (next[zoneUuid]) {
      next[zoneUuid] = next[zoneUuid].filter((id) => id !== driverUuid);
    }
  }

  for (const zoneUuid of addedZoneUuids) {
    const existing = next[zoneUuid] ?? [];
    next[zoneUuid] = existing.includes(driverUuid) ? existing : [...existing, driverUuid];
  }

  return next;
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
