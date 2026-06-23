/**
 * Pure function: filters user list for the Owner dropdown.
 *
 * - When form is disabled (read-only): show all users so the owner name is visible
 * - Admin or Account Manager: show all admins and account managers, so any AM
 *   can assign ownership to any other AM (or admin), not just themselves
 * - Everyone else (e.g. viewer): show only the current user
 */
export function filterOwnerOptions<T extends { id: string; is_admin?: boolean | number | null }>(params: {
  users: T[];
  isAdmin: boolean;
  currentUserId: string | null;
  disabled: boolean;
  accountManagerUserIds: Set<string>;
}): T[] {
  const { users, isAdmin, currentUserId, disabled, accountManagerUserIds } = params;

  if (disabled) return users;

  const isAccountManager = currentUserId != null && accountManagerUserIds.has(currentUserId);

  if (isAdmin || isAccountManager) {
    return users.filter((u) => !!u.is_admin || accountManagerUserIds.has(u.id));
  }

  return users.filter((u) => u.id === currentUserId);
}
