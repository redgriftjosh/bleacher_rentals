import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { useDashboardBleachersStore } from "@/features/dashboard/state/useDashboardBleachersStore";
import { hasSubrentalAccessForDate } from "@/features/userAccess/logic/hasSubrentalAccessForDate";
import {
  canEditWorkTracker,
  canReleaseWorkTracker,
} from "@/features/userAccess/logic/canEditWorkTracker";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";

type WorkTrackerEditContextRow = {
  created_by_user_uuid: string | null;
  driver_uuid: string | null;
  status: string | null;
  date: string | null;
  bleacher_uuid: string | null;
  zone_uuid: string | null;
  pickup_address_uuid: string | null;
  dropoff_address_uuid: string | null;
};

export async function fetchWorkTrackerEditContext(
  workTrackerUuid: string,
): Promise<WorkTrackerEditContextRow | null> {
  const rows = await typedGetAll(
    db
      .selectFrom("WorkTrackers as wt")
      .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
      .select([
        "wt.created_by_user_uuid",
        "wt.driver_uuid",
        "wt.status",
        "wt.date",
        "wt.bleacher_uuid",
        "wt.pickup_address_uuid",
        "wt.dropoff_address_uuid",
        "b.zone_uuid",
      ])
      .where("wt.id", "=", workTrackerUuid)
      .limit(1)
      .compile(),
    expect<WorkTrackerEditContextRow>(),
  );

  return rows[0] ?? null;
}

export async function canEditWorkTrackerByUuid(workTrackerUuid: string): Promise<boolean> {
  const context = await fetchWorkTrackerEditContext(workTrackerUuid);
  if (!context) return false;

  const perms = usePermissionsStore.getState();
  if (perms.isAdmin) return true;

  if (context.status === "released" && !canReleaseWorkTrackerForZone(context.zone_uuid)) {
    return false;
  }

  const canEdit = canEditWorkTracker({
    isAdmin: perms.isAdmin,
    isAccountManager: perms.isAccountManager,
    isNew: false,
    zoneUuid: context.zone_uuid,
    leadZoneIds: perms.leadZoneIds,
    accountManagerZoneIds: perms.accountManagerZoneIds,
    createdByUserId: context.created_by_user_uuid,
    userId: perms.userId,
  });

  if (canEdit) return true;

  if (!perms.isAccountManager) return false;

  return hasSubrentalAccessForDate({
    bleacherUuid: context.bleacher_uuid,
    date: context.date,
    accountManagerZoneIds: perms.accountManagerZoneIds,
    allBleachers: useDashboardBleachersStore.getState().data,
  });
}

export function canReleaseWorkTrackerForZone(zoneUuid: string | null | undefined): boolean {
  const perms = usePermissionsStore.getState();
  return canReleaseWorkTracker({
    isAdmin: perms.isAdmin,
    zoneUuid,
    leadZoneIds: perms.leadZoneIds,
    accountManagerZoneIds: perms.accountManagerZoneIds,
  });
}
