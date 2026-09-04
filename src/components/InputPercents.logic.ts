/**
 * Percent typing, without the field fighting the typist.
 *
 * Rates are not whole numbers: Quebec charges 14.975 %. The field therefore has
 * to survive every intermediate string a person passes through on the way to
 * one — "1", "14", "14.", "14.9" — while still refusing the things a percent
 * cannot be.
 */

/** Quebec's 14.975 % is the reason this is 3 and not 2. */
export const MAX_PERCENT_DECIMALS = 3;

export type SanitizedPercent = {
  /** What the field should show, without the trailing "%". */
  display: string;
  /** The number to store. A half-typed "14." is worth 14. */
  value: number;
};

/**
 * Normalises one raw keystroke-level string into a percent.
 *
 * Accepts a comma as the decimal separator (a French-Canadian keyboard types
 * "14,975"), caps the fraction at {@link MAX_PERCENT_DECIMALS}, and clamps the
 * value to 0-100. A trailing separator is kept so the next digit has somewhere
 * to land.
 */
export function sanitizePercentInput(raw: string): SanitizedPercent {
  const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");

  const [wholePart, ...fractionParts] = normalized.split(".");
  const hasSeparator = fractionParts.length > 0;
  const fraction = fractionParts.join("").slice(0, MAX_PERCENT_DECIMALS);

  const trimmedWhole = wholePart.replace(/^0+(?=\d)/, "");
  const whole = trimmedWhole === "" ? "0" : trimmedWhole;

  const display = hasSeparator ? `${whole}.${fraction}` : whole;
  const value = Number(hasSeparator ? `${whole}.${fraction || "0"}` : whole);

  if (value > 100) return { display: "100", value: 100 };

  return { display, value };
}
