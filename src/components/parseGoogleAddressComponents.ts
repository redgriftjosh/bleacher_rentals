export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type ParsedAddress = {
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

/**
 * Turns Google's `address_components` for one geocoded place into the flat
 * shape the rest of the app saves. Used to be `address` = the raw dropdown
 * suggestion text (the full "Business Name, Street, City, Province, Country"
 * string) and `city` = whatever `locality` component turned up, with no
 * fallback — which is how a rural/business result's county ended up saved as
 * its city. See docs/specs (AddressAutoComplete parsing fix).
 */
export function parseGoogleAddressComponents(
  components: GoogleAddressComponent[],
  fallbackAddress: string,
): ParsedAddress {
  const componentOfType = (...types: string[]): string | undefined =>
    components.find((comp) => types.some((t) => comp.types.includes(t)))?.long_name;

  const streetNumber = componentOfType("street_number");
  const route = componentOfType("route");
  // Not every result has a street number + route (a named property, a park,
  // etc.) — fall back to the full suggestion text rather than an empty street.
  const address = [streetNumber, route].filter(Boolean).join(" ") || fallbackAddress;

  const state = componentOfType("administrative_area_level_1");
  // `locality` is the town/city for most results, but rural or business-only
  // places sometimes only carry a coarser component — fall back through the
  // next-most-specific ones rather than leaving city blank (or saving a
  // county in its place).
  const city = componentOfType(
    "locality",
    "sublocality",
    "postal_town",
    "administrative_area_level_3",
  );
  const postalCode = componentOfType("postal_code");

  return { address, city, state, postalCode };
}
