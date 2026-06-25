/**
 * Soft duplicate detection for contacts and companies.
 *
 * These helpers are advisory only — they power an inline warning at create time
 * so a user notices an existing record before adding a near-identical one. They
 * do NOT block saving and there is no DB-level uniqueness constraint.
 */

/** Lowercased + trimmed email, or "" when empty. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Digits only, with a leading NANP country code dropped, so "+1 (555) 123-4567"
 * and "555-123-4567" compare equal. (US-centric app; an 11-digit number starting
 * with 1 is treated as having a country code.)
 */
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Trimmed, lowercased, whitespace-collapsed name. */
export function normalizeName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

type ContactLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type CompanyLike = {
  id: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Existing contacts that share the given email or phone. Empty inputs never
 * match. `excludeId` skips the record currently being edited.
 */
export function findContactDuplicates<T extends ContactLike>(
  contacts: T[],
  fields: { email: string; phone: string },
  excludeId?: string,
): T[] {
  const email = normalizeEmail(fields.email);
  const phone = normalizePhone(fields.phone);
  if (!email && !phone) return [];

  return contacts.filter((c) => {
    if (c.id === excludeId) return false;
    const emailMatch = !!email && normalizeEmail(c.email) === email;
    const phoneMatch = !!phone && normalizePhone(c.phone) === phone;
    return emailMatch || phoneMatch;
  });
}

/**
 * Existing companies that share the given email or phone (name is ignored).
 * Used to hard-block creating a company with an email/phone already in use.
 */
export function findCompanyContactDuplicates<T extends CompanyLike>(
  companies: T[],
  fields: { email: string; phone: string },
  excludeId?: string,
): T[] {
  const email = normalizeEmail(fields.email);
  const phone = normalizePhone(fields.phone);
  if (!email && !phone) return [];

  return companies.filter((c) => {
    if (c.id === excludeId) return false;
    const emailMatch = !!email && normalizeEmail(c.email) === email;
    const phoneMatch = !!phone && normalizePhone(c.phone) === phone;
    return emailMatch || phoneMatch;
  });
}

/**
 * Existing companies that share the given name, email or phone. Empty inputs
 * never match. `excludeId` skips the record currently being edited.
 */
export function findCompanyDuplicates<T extends CompanyLike>(
  companies: T[],
  fields: { companyName: string; email?: string; phone?: string },
  excludeId?: string,
): T[] {
  const name = normalizeName(fields.companyName);
  const email = normalizeEmail(fields.email);
  const phone = normalizePhone(fields.phone);
  if (!name && !email && !phone) return [];

  return companies.filter((c) => {
    if (c.id === excludeId) return false;
    const nameMatch = !!name && normalizeName(c.companyName) === name;
    const emailMatch = !!email && normalizeEmail(c.email) === email;
    const phoneMatch = !!phone && normalizePhone(c.phone) === phone;
    return nameMatch || emailMatch || phoneMatch;
  });
}
