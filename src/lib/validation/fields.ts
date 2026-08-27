/**
 * Field-level validators shared by every contact / company form.
 *
 * Each validator returns an error message, or `null` when the value is acceptable.
 * Empty input is valid for optional fields — requiredness is expressed explicitly
 * via the `required` flag so a single validator covers both cases.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** Digits plus the punctuation people actually type in a phone number. */
const PHONE_ALLOWED_RE = /^[+\d\s().-]+$/;

/** Anything that carries at least one letter or digit — rejects "..." / "---" names. */
const HAS_ALPHANUMERIC_RE = /[\p{L}\p{N}]/u;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function validateEmail(value: string, options: { required?: boolean } = {}): string | null {
  const email = value.trim();
  if (!email) return options.required ? "Email is required." : null;
  if (!isValidEmail(email)) return "Enter a valid email address, e.g. jane@company.com.";
  return null;
}

/**
 * Phone numbers are US-centric here (matching `normalizePhone` in findDuplicates), but a
 * number written with an explicit `+` country code is accepted as international.
 */
export function validatePhone(value: string, options: { required?: boolean } = {}): string | null {
  const phone = value.trim();
  if (!phone) return options.required ? "Phone is required." : null;

  if (!PHONE_ALLOWED_RE.test(phone)) {
    return "Phone can only contain digits and the symbols + ( ) - . and spaces.";
  }

  const digits = phone.replace(/\D/g, "");

  if (phone.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15
      ? null
      : "Enter a valid international phone number, e.g. +44 20 7946 0958.";
  }

  if (digits.length === 10) return null;
  if (digits.length === 11 && digits.startsWith("1")) return null;

  return "Enter a 10-digit US phone number, e.g. (555) 123-4567.";
}

/** Free-text name (person or company). `label` is inlined into the message. */
export function validateName(
  value: string,
  label: string,
  options: { required?: boolean; minLength?: number } = {},
): string | null {
  const { required = false, minLength = 2 } = options;
  const name = value.trim();

  if (!name) return required ? `${label} is required.` : null;
  if (name.length < minLength) return `${label} must be at least ${minLength} characters.`;
  if (!HAS_ALPHANUMERIC_RE.test(name)) return `${label} must contain letters or numbers.`;
  return null;
}

/** Drops the `null` entries so the result only holds real errors. */
export function collectErrors<K extends string>(
  candidates: Record<K, string | null>,
): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const [key, message] of Object.entries(candidates) as [K, string | null][]) {
    if (message) errors[key] = message;
  }
  return errors;
}
