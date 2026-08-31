export type SprintLabelDiff = {
  toAdd: string[];
  toRemove: string[];
};

/**
 * Works out the minimal set of `RoadmapFeatureSprintLabels` writes.
 *
 * Autosave runs on every keystroke, so the old "delete them all and re-insert"
 * approach would push a burst of pointless rows through the PowerSync upload queue.
 */
export function diffSprintLabels(existing: string[], desired: string[]): SprintLabelDiff {
  const existingSet = new Set(existing);
  const desiredSet = new Set(desired);

  return {
    toAdd: [...desiredSet].filter((id) => !existingSet.has(id)),
    toRemove: [...existingSet].filter((id) => !desiredSet.has(id)),
  };
}
