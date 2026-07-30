/**
 * Client-side calls to the Stripe server routes.
 *
 * Reads and the soft-delete / restore writes do NOT live here -- those go
 * through PowerSync (see useStripeConnections and stripeConnectionsDb). The
 * only thing that must round-trip to the server is refreshing status from
 * Stripe, because that needs the platform secret key.
 */

export type StripeHealthResult = { ok: boolean; connected?: boolean; error?: string };

/**
 * Asks the server to re-fetch this connection's status from Stripe. The server
 * persists it, which syncs back down to PowerSync, so the reactive list updates
 * on its own; the returned value is only used to show a transient error.
 */
export async function refreshStripeConnectionStatus(
  connectionId: string,
): Promise<StripeHealthResult> {
  const response = await fetch(
    `/api/stripe/connections/health?connectionId=${encodeURIComponent(connectionId)}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Failed to check connection" }));
    throw new Error(body.error || "Failed to check connection");
  }

  return response.json();
}
