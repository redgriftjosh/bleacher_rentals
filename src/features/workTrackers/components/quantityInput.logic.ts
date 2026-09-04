/**
 * Line item quantity typing, without the field fighting the typist.
 *
 * Work does not arrive in whole units: half a day of setup, 2.5 hours of
 * maintenance. The field therefore has to survive every intermediate string a
 * person passes through on the way to one — "2", "2.", "2.5" — while still
 * refusing the things a quantity cannot be.
 *
 * Deliberately shaped like `sanitizePercentInput`, with two differences that
 * come from the column rather than from taste: one decimal instead of three
 * (`qty_decimal` is `numeric(10,1)`), and no upper clamp — a line can legitimately
 * carry any number of units.
 */

/** `qty_decimal` is `numeric(10,1)`, so a second decimal has nowhere to be stored. */
export const MAX_QUANTITY_DECIMALS = 1;

export type SanitizedQuantity = {
  /** What the field should show. */
  display: string;
  /** The number to store. A half-typed "2." is worth 2. */
  value: number;
};

/**
 * Normalises one raw keystroke-level string into a quantity.
 *
 * Accepts a comma as the decimal separator, caps the fraction at
 * {@link MAX_QUANTITY_DECIMALS}, and drops the minus sign — the table checks
 * `qty_decimal >= 0`, so a negative could only ever be rejected on save. A
 * trailing separator is kept so the next digit has somewhere to land.
 *
 * An emptied field stays empty rather than snapping to "0": the typist is on
 * their way to another number, and a 0 they have to select and overwrite is the
 * exact papercut this helper exists to avoid. It still reports `value: 0` so
 * callers never see a `NaN`.
 */
export function sanitizeQuantityInput(raw: string): SanitizedQuantity {
  const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");

  if (normalized === "") return { display: "", value: 0 };

  const [wholePart, ...fractionParts] = normalized.split(".");
  const hasSeparator = fractionParts.length > 0;
  const fraction = fractionParts.join("").slice(0, MAX_QUANTITY_DECIMALS);

  const trimmedWhole = wholePart.replace(/^0+(?=\d)/, "");
  const whole = trimmedWhole === "" ? "0" : trimmedWhole;

  const display = hasSeparator ? `${whole}.${fraction}` : whole;
  const value = Number(hasSeparator ? `${whole}.${fraction || "0"}` : whole);

  return { display, value };
}
