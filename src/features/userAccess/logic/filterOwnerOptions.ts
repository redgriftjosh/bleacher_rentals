/**
 * Pure function: filters user list for the Owner dropdown.
 *
 * - When form is disabled (read-only): show all users so the owner name is visible
 * - Admin: show all users
 * - AM (non-admin): show only the current user
 */
export function filterOwnerOptions<T extends { id: string }>(params: {
  users: T[];
  isAdmin: boolean;
  currentUserId: string | null;
  disabled: boolean;
}): T[] {
  const { users, isAdmin, currentUserId, disabled } = params;

  if (disabled || isAdmin) return users;

  return users.filter((u) => u.id === currentUserId);
}
