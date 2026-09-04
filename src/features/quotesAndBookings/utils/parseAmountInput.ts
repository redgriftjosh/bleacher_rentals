/**
 * Turns what accounting types into signed integer cents.
 *
 * A payment may be negative — that is how a refund, a bounced check and a
 * corrected typo are expressed, because the ledger is append-only and a
 * negative row is the only way to undo anything. So this parser treats a
 * leading minus and accounting's `(12.00)` parentheses as first-class input,
 * not as malformed text to reject.
 *
 * Everything is done on the digit string. `parseFloat(raw) * 100` is the
 * obvious implementation and it is wrong: `8.29 * 100` is 828.9999999999999,
 * which truncates to a cent short on a real invoice.
 *
 * See docs/specs/manual-payment-entry.md §5, §6.3, T1.
 */

/** $1,000,000. A typo guard, not a business limit — §6.3. */
export const MAX_PAYMENT_CENTS = 100_000_000;

export type ParsedAmount =
  | { ok: true; cents: number }
  | { ok: false; reason: "empty" | "not-a-number" | "zero" | "too-large" };

/**
 * Currency symbols and thousands separators carry no meaning for the value.
 *
 * Internal whitespace is deliberately NOT stripped. Treating it as a
 * thousands separator would read "1 2" as $12.00 — a silent money bug on a
 * slip of the space bar — and this app's separator is the comma anyway.
 * Surrounding whitespace is handled by the trim.
 */
const NOISE = /[$€£¥,]/g;

/** Digits with at most one decimal point, and at least one digit somewhere. */
const NUMERIC = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export function parseAmountInput(raw: string): ParsedAmount {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };

  // Accounting writes a negative as (12.00). Unwrap before anything else, so
  // the symbol and sign handling below sees a plain number either way.
  const parenthesised = /^\((.*)\)$/.exec(trimmed);
  const body = parenthesised ? parenthesised[1] : trimmed;

  const stripped = body.replace(NOISE, "");
  if (stripped === "") return { ok: false, reason: "empty" };

  // The sign may sit either side of the currency symbol — "$-5" and "-$5" both
  // reach here as "-5". A parenthesised amount is negative on its own; if it
  // also carries a minus we keep it negative rather than cancelling to
  // positive, because "(-12)" is a typo, never a request for +12.
  const signed = /^[+-]/.test(stripped);
  const digits = signed ? stripped.slice(1) : stripped;
  const isNegative = !!parenthesised || stripped.startsWith("-");

  if (!NUMERIC.test(digits)) return { ok: false, reason: "not-a-number" };

  const [whole, fraction = ""] = digits.split(".");

  // Half-up on the magnitude, sign applied afterwards, so -12.345 rounds away
  // from zero to -1235 and mirrors 12.345 → 1235 exactly.
  const padded = fraction.padEnd(3, "0");
  const base = Number(whole || "0") * 100 + Number(padded.slice(0, 2));
  const magnitude = Number(padded[2]) >= 5 ? base + 1 : base;

  if (!Number.isFinite(magnitude)) return { ok: false, reason: "not-a-number" };
  if (magnitude === 0) return { ok: false, reason: "zero" };
  if (magnitude > MAX_PAYMENT_CENTS) return { ok: false, reason: "too-large" };

  return { ok: true, cents: isNegative ? -magnitude : magnitude };
}
