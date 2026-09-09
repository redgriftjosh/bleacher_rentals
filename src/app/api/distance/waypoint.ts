/** A Google Routes API `Waypoint`, restricted to the two shapes this app uses. */
export type RoutesWaypoint =
  | { address: string }
  | { location: { latLng: { latitude: number; longitude: number } } };

const LAT_LNG_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * `origin`/`dest` are either a `"lat,lng"` string (from `toLatLngString`, when
 * the address has real coordinates) or a human-readable address (the
 * fallback when it doesn't). The Routes API needs a different `Waypoint`
 * shape for each — `address` only ever geocodes text, so feeding it a
 * coordinate pair 400s instead of resolving it.
 */
export function buildRoutesWaypoint(value: string): RoutesWaypoint {
  const match = LAT_LNG_PATTERN.exec(value);
  if (match) {
    return {
      location: {
        latLng: { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) },
      },
    };
  }
  return { address: value };
}
