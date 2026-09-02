/**
 * Quotes are sent from the assigned account manager's address, so that address
 * has to be on the company domain. A personal address cannot be sent from.
 */
export const COMPANY_EMAIL_DOMAIN = "@bleacherrentals.com";

/**
 * True when the address is on the company domain. A missing address counts as
 * not company — a quote cannot be sent from an account with no email either.
 */
export function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(COMPANY_EMAIL_DOMAIN);
}
