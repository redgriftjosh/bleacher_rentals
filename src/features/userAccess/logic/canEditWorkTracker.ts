import { getAmRoleForZone } from "./getAmRoleForZone";

export function canEditWorkTracker(params: {
  isAdmin: boolean;
  isAccountManager: boolean;
  isNew: boolean;
  canCreate?: boolean;
  zoneUuid?: string | null;
  leadZoneIds?: string[];
  accountManagerZoneIds?: string[];
  createdByUserId?: string | null;
  userId?: string | null;
}): boolean {
  const {
    isAdmin,
    isAccountManager,
    isNew,
    canCreate = true,
    zoneUuid,
    leadZoneIds = [],
    accountManagerZoneIds = [],
    createdByUserId,
    userId,
  } = params;

  if (isAdmin) return true;

  if (!isAccountManager) {
    return isNew && canCreate;
  }

  if (isNew) return canCreate;

  const role = getAmRoleForZone({ zoneUuid, leadZoneIds, accountManagerZoneIds });

  if (role === "lead") return true;
  if (role === "junior") {
    return !!userId && !!createdByUserId && createdByUserId === userId;
  }

  return false;
}

export function canReleaseWorkTracker(params: {
  isAdmin: boolean;
  zoneUuid: string | null | undefined;
  leadZoneIds: string[];
  accountManagerZoneIds: string[];
}): boolean {
  if (params.isAdmin) return true;

  const role = getAmRoleForZone({
    zoneUuid: params.zoneUuid,
    leadZoneIds: params.leadZoneIds,
    accountManagerZoneIds: params.accountManagerZoneIds,
  });

  return role === "lead";
}
