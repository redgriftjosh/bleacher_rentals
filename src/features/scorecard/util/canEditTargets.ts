/**
 * Determines whether the current user can open the "Set targets" modal
 * for a given stat card.
 *
 * Only admins may modify scorecard targets.
 */
export function canEditTargets(
  isAdmin: boolean,
  accountManagerUuid: string | null | undefined,
  statType: string | null | undefined,
): boolean {
  return isAdmin && Boolean(accountManagerUuid) && Boolean(statType);
}
