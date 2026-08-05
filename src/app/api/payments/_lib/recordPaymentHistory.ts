import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/**
 * Shared server-side write path for payment history.
 *
 * All PaymentHistory writes happen here (called from the Stripe webhook), using a
 * Supabase **service-role** client that bypasses RLS by design. Browser / PowerSync
 * clients must never insert into PaymentHistory — the table is locked to SELECT-only
 * for staff roles (see supabase/migrations/*_payment_history_rls.sql).
 *
 * Handles the `checkout.session.completed` event only (success-only recording).
 */

export type RecordPaymentResult =
  | { ok: true; duplicate?: boolean }
  | { ok: false; status: number; error: string };

// Postgres unique_violation — a duplicate webhook delivery hitting the unique index
// on stripe_checkout_session_id. Safe to treat as an idempotent no-op.
const UNIQUE_VIOLATION = "23505";

export async function recordPaymentHistoryFromCheckoutSession(
  session: Stripe.Checkout.Session,
  deps: { stripe: Stripe; supabase: SupabaseClient },
): Promise<RecordPaymentResult> {
  const { stripe, supabase } = deps;
  const { eventId, installmentId, payerName } = session.metadata ?? {};

  if (!eventId) {
    return { ok: false, status: 400, error: "No eventId in metadata" };
  }

  // Best-effort receipt URL from the payment intent's latest charge; never blocks insert.
  let receiptUrl: string | null = null;
  if (typeof session.payment_intent === "string") {
    try {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ["latest_charge"],
      });
      const charge = pi.latest_charge;
      if (charge && typeof charge !== "string") {
        receiptUrl = charge.receipt_url ?? null;
      }
    } catch (err) {
      console.error("[recordPaymentHistory] Failed to fetch receipt URL:", err);
    }
  }

  const { error: insertError } = await supabase.from("PaymentHistory").insert({
    event_uuid: eventId,
    installment_id: installmentId || null,
    amount_cents: session.amount_total ?? 0,
    currency: (session.currency ?? "usd").toUpperCase(),
    status: "succeeded",
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_checkout_session_id: session.id,
    stripe_receipt_url: receiptUrl,
    payment_method_type: session.payment_method_types?.[0] ?? "card",
    payer_name: payerName ?? "Unknown",
    payer_email: session.customer_email ?? null,
    paid_at: new Date().toISOString(),
  });

  if (insertError) {
    // Idempotency: a redelivered webhook collides on the session-id unique index.
    if ((insertError as { code?: string }).code === UNIQUE_VIOLATION) {
      console.log("[recordPaymentHistory] Duplicate checkout session ignored:", session.id);
      return { ok: true, duplicate: true };
    }
    console.error("[recordPaymentHistory] PaymentHistory insert failed:", insertError);
    // Non-2xx so Stripe retries rather than silently dropping the payment record.
    return { ok: false, status: 500, error: insertError.message };
  }

  console.log(
    "[recordPaymentHistory] PaymentHistory inserted for event:",
    eventId,
    "amount:",
    session.amount_total,
  );

  // Installment update is a best-effort follow-up; a failure here must not roll back
  // (or fail) the recorded payment — the history row is the source of truth.
  if (installmentId) {
    const { error: updateError } = await supabase
      .from("PaymentInstallments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", installmentId);

    if (updateError) {
      console.error("[recordPaymentHistory] Installment update failed:", updateError);
    } else {
      console.log("[recordPaymentHistory] Installment marked paid:", installmentId);
    }
  }

  return { ok: true };
}
