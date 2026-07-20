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
 * - Part 2: a non-admin cannot reassign an event already owned by another
 *   account manager to themselves. When `existingOwnerId` is set and is not the
 *   current user, the current user is removed from the selectable options.
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
  /** Persisted owner of the event being edited (null for new events). */
  existingOwnerId?: string | null;
}): T[] {
  const {
    users,
    isAdmin,
    currentUserId,
    disabled,
    accountManagerUserIds,
    inactiveStatusUuid,
    existingOwnerId = null,
  } = params;

  if (disabled) return users;

  const selectable = inactiveStatusUuid
    ? users.filter((u) => u.status_uuid !== inactiveStatusUuid)
    : users;

  const isAccountManager = currentUserId != null && accountManagerUserIds.has(currentUserId);

  // Part 2: non-admin cannot grab ownership of another AM's event.
  const cannotReassignToSelf =
    !isAdmin &&
    currentUserId != null &&
    existingOwnerId != null &&
    existingOwnerId !== currentUserId;

  if (isAdmin || isAccountManager) {
    return selectable.filter(
      (u) =>
        (!!u.is_admin || accountManagerUserIds.has(u.id)) &&
        !(cannotReassignToSelf && u.id === currentUserId),
    );
  }

  return selectable.filter((u) => u.id === currentUserId);
}
