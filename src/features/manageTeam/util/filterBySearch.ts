type SearchableUser = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

/**
 * Filters an array of users by search query (name or email)
 */
export function filterBySearch<T extends SearchableUser>(users: T[], searchQuery: string): T[] {
  if (!searchQuery.trim()) {
    return users;
  }

  const query = searchQuery.toLowerCase();
  return users.filter(
    (user) =>
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
  );
}
