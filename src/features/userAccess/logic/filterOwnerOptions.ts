/**
 * Pure function: filters user list for the Owner dropdown.
 *
 * - When form is disabled (read-only): show all users so the owner name is visible
 * - Admin: show only admins and account managers
 * - AM (non-admin): show only the current user
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

  if (isAdmin) {
    return users.filter(
      (u) => !!u.is_admin || accountManagerUserIds.has(u.id),
    );
  }

  return users.filter((u) => u.id === currentUserId);
}
