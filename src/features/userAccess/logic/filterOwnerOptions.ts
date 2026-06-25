/**
 * Pure function: filters user list for the Owner dropdown.
 *
 * - When form is disabled (read-only): show all users so the owner name is visible
 *   (even deactivated ones, so an existing owner's name still renders)
 * - Admin or Account Manager: show all admins and account managers, so any AM
 *   can assign ownership to any other AM (or admin), not just themselves
 * - Everyone else (e.g. viewer): show only the current user
 * - When `inactiveStatusUuid` is provided, deactivated users are excluded from
 *   the selectable list (but never in read-only mode, per above)
 */
export function filterOwnerOptions<
  T extends { id: string; is_admin?: boolean | number | null; status_uuid?: string | null },
>(params: {
  users: T[];
  isAdmin: boolean;
  currentUserId: string | null;
  disabled: boolean;
  accountManagerUserIds: Set<string>;
  inactiveStatusUuid?: string | null;
}): T[] {
  const { users, isAdmin, currentUserId, disabled, accountManagerUserIds, inactiveStatusUuid } =
    params;

  if (disabled) return users;

  const selectable = inactiveStatusUuid
    ? users.filter((u) => u.status_uuid !== inactiveStatusUuid)
    : users;

  const isAccountManager = currentUserId != null && accountManagerUserIds.has(currentUserId);

  if (isAdmin || isAccountManager) {
    return selectable.filter((u) => !!u.is_admin || accountManagerUserIds.has(u.id));
  }

  return selectable.filter((u) => u.id === currentUserId);
}
