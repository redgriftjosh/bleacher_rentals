export type DamageSeverityLevel = "none" | "minor" | "major";

/**
 * Effective per-column damage: prefers seat_damage/haul_damage; falls back to legacy
 * is_safe_to_* when severity is none/null (false → major, matching dashboard overlay rules).
 */
export function effectiveColumnDamage(
  severity: string | null | undefined,
  isSafe: boolean | number | null | undefined,
): DamageSeverityLevel {
  const normalized = (severity ?? "none") as DamageSeverityLevel;
  if (normalized === "major" || normalized === "minor") return normalized;
  const safe = isSafe === true || isSafe === 1;
  if (!safe) return "major";
  return "none";
}

/** Squiggle severity when seat/haul are already effective (no legacy boolean pass). */
export function overlaySeverityFromEffective(
  seat: DamageSeverityLevel,
  haul: DamageSeverityLevel,
): "major" | "minor" | null {
  if (seat === "major" || haul === "major") return "major";
  if (seat === "minor" || haul === "minor") return "minor";
  return null;
}

/** Overlay squiggle severity for a damage report, or null when no squiggles should show. */
export function computeDamageOverlaySeverity(
  seatDamage: string | null | undefined,
  haulDamage: string | null | undefined,
  isSafeToSit: boolean | number | null | undefined,
  isSafeToHaul: boolean | number | null | undefined,
): "major" | "minor" | null {
  const seat = effectiveColumnDamage(seatDamage, isSafeToSit);
  const haul = effectiveColumnDamage(haulDamage, isSafeToHaul);
  return overlaySeverityFromEffective(seat, haul);
}
