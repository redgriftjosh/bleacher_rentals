/**
 * Classify local work-tracker-type entries for the save operation.
 *
 * - toDelete: existing types the user marked for (soft) deletion
 * - toInsert: brand-new types that haven't been deleted before saving
 * - toUpdate: existing types that are still active
 * - visible:  everything the user should see (not marked deleted)
 */
export function classifyWorkTrackerTypes<
  T extends { _deleted?: boolean; _new?: boolean },
>(types: T[]) {
  return {
    toDelete: types.filter((t) => t._deleted && !t._new),
    toInsert: types.filter((t) => t._new && !t._deleted),
    toUpdate: types.filter((t) => !t._new && !t._deleted),
    visible: types.filter((t) => !t._deleted),
  };
}
