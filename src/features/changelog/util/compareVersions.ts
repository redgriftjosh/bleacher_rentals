export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isValidVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}

/**
 * Semver compare on major.minor.patch.
 *
 * Never sort versions as strings — "1.10.0" sorts before "1.9.0" that way.
 * Returns <0 when a is older, >0 when a is newer, 0 when equal.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
