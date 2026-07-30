/**
 * UI-facing shape of a Stripe connection.
 *
 * Booleans are real booleans here. The local PowerSync store keeps them as
 * SQLite integers (0/1), so the reactive hook is responsible for converting;
 * everything above the hook works with this clean type.
 */
export type StripeConnection = {
  id: string;
  createdAt: string | null;
  deletedAt: string | null;
  stripeAccountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  livemode: boolean;
  businessName: string | null;
};

/**
 * Derived, display-ready status for a connection. Kept as one function so the
 * page and any future caller label a connection the same way.
 */
export type StripeConnectionStatus = "not_connected" | "incomplete" | "pending" | "ready";

export function deriveStripeConnectionStatus(conn: StripeConnection): StripeConnectionStatus {
  if (!conn.stripeAccountId) return "not_connected";
  if (conn.chargesEnabled) return "ready";
  if (conn.detailsSubmitted) return "pending";
  return "incomplete";
}
