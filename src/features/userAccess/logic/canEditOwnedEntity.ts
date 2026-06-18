import { getAmRoleForZone } from "./getAmRoleForZone";

export function canEditOwnedEntity(params: {
  isAdmin: boolean;
  isNew: boolean;
  canCreate?: boolean;
  zoneUuid?: string | null;
  leadZoneIds?: string[];
  accountManagerZoneIds?: string[];
  createdByUserId?: string | null;
  assignedUserId?: string | null;
  userId?: string | null;
}): boolean {
  const {
    isAdmin,
    isNew,
    canCreate = true,
    zoneUuid,
    leadZoneIds = [],
    accountManagerZoneIds = [],
    createdByUserId,
    assignedUserId,
    userId,
  } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;
  if (!canCreate) return false;

  const role = getAmRoleForZone({ zoneUuid, leadZoneIds, accountManagerZoneIds });

  if (role === "lead") return true;
  if (role === "junior") {
    if (!userId) return false;
    return (!!createdByUserId && createdByUserId === userId) ||
           (!!assignedUserId && assignedUserId === userId);
  }

  if (accountManagerZoneIds.length > 0) return false;

  return true;
}

export function canSendQuote(params: {
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
