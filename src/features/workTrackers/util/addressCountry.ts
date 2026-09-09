/**
 * Whether an address is in the given country. Prefers the address's real
 * `country` column (ISO-2, e.g. "US"/"CA") — falls back to guessing from the
 * tail of `street` only for an address saved before that column existed and
 * never re-saved since (no backfill). Once `country` is set for an address,
 * it is trusted outright — even a `street` that happens to also match the
 * other country's pattern doesn't override it.
 */
function isAddressCountry(
  isoCode: "US" | "CA",
  legacyStreetPattern: RegExp,
  country: string | null | undefined,
  street: string | null | undefined,
): boolean {
  if (country) return country === isoCode;
  if (!street) return false;
  return legacyStreetPattern.test(street);
}

export function isUsaAddress(
  country: string | null | undefined,
  street: string | null | undefined,
): boolean {
  return isAddressCountry("US", /usa|united states/i, country, street);
}

export function isCanadianAddress(
  country: string | null | undefined,
  street: string | null | undefined,
): boolean {
  return isAddressCountry("CA", /canada/i, country, street);
}

/** "US" | "CAN" | null — the region shape `DriverWithMeta.region` already used. */
export function deriveRegion(
  country: string | null | undefined,
  street: string | null | undefined,
): "US" | "CAN" | null {
  if (isUsaAddress(country, street)) return "US";
  if (isCanadianAddress(country, street)) return "CAN";
  return null;
}
