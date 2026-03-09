/**
 * Client-side API functions for QuickBooks integration.
 * All requests go through authenticated Next.js API routes.
 */

export type QboVendor = {
  id: string;
  displayName: string;
  companyName?: string;
  active: boolean;
};

/**
 * Fetches active vendors from QuickBooks.
 * Requires user to be authenticated (handled by API route).
 */
export async function fetchQboVendors(): Promise<QboVendor[]> {
  const response = await fetch("/api/quickbooks/vendors");

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch vendors" }));
    throw new Error(error.error || "Failed to fetch vendors");
  }

  const data = await response.json();
  return data.vendors || [];
}

export type QboClass = {
  id: string;
  name: string;
  fullyQualifiedName: string;
  active: boolean;
};

export type QboAccount = {
  id: string;
  name: string;
  fullyQualifiedName: string;
  accountType: string;
  accountSubType: string;
  active: boolean;
};

/**
 * Fetches active expense accounts from QuickBooks.
 * Requires user to be authenticated (handled by API route).
 */
export async function fetchQboAccounts(): Promise<QboAccount[]> {
  const response = await fetch("/api/quickbooks/accounts");

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch accounts" }));
    throw new Error(error.error || "Failed to fetch accounts");
  }

  const data = await response.json();
  return data.accounts || [];
}

/**
 * Fetches active classes from QuickBooks.
 * Requires user to be authenticated (handled by API route).
 */
export async function fetchQboClasses(): Promise<QboClass[]> {
  const response = await fetch("/api/quickbooks/classes");

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch classes" }));
    throw new Error(error.error || "Failed to fetch classes");
  }

  const data = await response.json();
  return data.classes || [];
}
