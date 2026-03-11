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
 * Fetches active vendors from QuickBooks for a specific connection.
 */
export async function fetchQboVendors(connectionId: string): Promise<QboVendor[]> {
  const response = await fetch(
    `/api/quickbooks/vendors?connectionId=${encodeURIComponent(connectionId)}`,
  );

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
 * Fetches active expense accounts from QuickBooks for a specific connection.
 */
export async function fetchQboAccounts(connectionId: string): Promise<QboAccount[]> {
  const response = await fetch(
    `/api/quickbooks/accounts?connectionId=${encodeURIComponent(connectionId)}`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch accounts" }));
    throw new Error(error.error || "Failed to fetch accounts");
  }

  const data = await response.json();
  return data.accounts || [];
}

/**
 * Fetches active classes from QuickBooks for a specific connection.
 */
export async function fetchQboClasses(connectionId: string): Promise<QboClass[]> {
  const response = await fetch(
    `/api/quickbooks/classes?connectionId=${encodeURIComponent(connectionId)}`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch classes" }));
    throw new Error(error.error || "Failed to fetch classes");
  }

  const data = await response.json();
  return data.classes || [];
}

export type QboConnection = {
  id: string;
  display_name: string;
  realm_id: string | null;
};

/**
 * Fetches all QBO connections.
 */
export async function fetchQboConnections(): Promise<QboConnection[]> {
  const response = await fetch("/api/quickbooks/connections");

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch connections" }));
    throw new Error(error.error || "Failed to fetch connections");
  }

  const data = await response.json();
  return data.connections || [];
}

/**
 * Creates a new QBO connection placeholder and returns the id.
 */
export async function createQboConnectionApi(displayName: string): Promise<string> {
  const response = await fetch("/api/quickbooks/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create connection" }));
    throw new Error(error.error || "Failed to create connection");
  }

  const data = await response.json();
  return data.connectionId;
}

/**
 * Deletes a QBO connection.
 */
export async function deleteQboConnectionApi(connectionId: string): Promise<void> {
  const response = await fetch(
    `/api/quickbooks/connections?connectionId=${encodeURIComponent(connectionId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to delete connection" }));
    throw new Error(error.error || "Failed to delete connection");
  }
}

/**
 * Renames a QBO connection's display name.
 */
export async function renameQboConnectionApi(
  connectionId: string,
  displayName: string,
): Promise<void> {
  const response = await fetch("/api/quickbooks/connections", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, displayName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to rename connection" }));
    throw new Error(error.error || "Failed to rename connection");
  }
}

/**
 * Checks health of a QBO connection.
 */
export async function checkQboConnectionHealth(
  connectionId: string,
): Promise<{ healthy: boolean; error?: string }> {
  const response = await fetch(
    `/api/quickbooks/connections/health?connectionId=${encodeURIComponent(connectionId)}`,
  );

  if (!response.ok) {
    return { healthy: false, error: "Failed to check connection health" };
  }

  return response.json();
}
