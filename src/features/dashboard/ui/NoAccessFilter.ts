import { Container, Graphics, Sprite } from "pixi.js";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { Baker } from "../util/Baker";
import { Bleacher } from "../types";

/**
 * Returns true if the current user has zone access to the given bleacher.
 */
export function isBleacherAccessible(bleacher: Bleacher | undefined): boolean {
  const perms = usePermissionsStore.getState();
  if (perms.isAdmin) return true;
  if (perms.isAccountManager) {
    return !!(bleacher?.zoneUuid && perms.accountManagerZoneIds.includes(bleacher.zoneUuid));
  }
  return false;
}
