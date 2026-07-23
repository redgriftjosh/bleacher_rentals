import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeForAccount } from "@/features/stripe-integration/util";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Direct charges settle on the office's connected account, so the event is
  // generated there and carries its `account` id. Sub-resources (the
  // PaymentIntent) live on that same connected account and must be read with a
  // Stripe-Account context — a platform-scoped read would 404. Events from the
  // platform account itself have no `account`, so we read without it.
  const connectedAccountId = event.account ?? undefined;

  console.log(
    "[Stripe Webhook] Received event:",
    event.type,
    event.id,
    connectedAccountId ? `(account ${connectedAccountId})` : "(platform)",
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { eventId, installmentId, payerName, stripeConnectionId } = session.metadata ?? {};

    if (!eventId) {
      return NextResponse.json({ error: "No eventId in metadata" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Idempotency: Stripe retries webhook deliveries, so the same checkout
    // session can arrive more than once. Recording it twice would double-count
    // the payment, so bail if we already have a row for this session. The
    // partial unique index on stripe_checkout_session_id is the hard guarantee
    // under concurrent retries; this check keeps the happy path clean.
    const { data: alreadyRecorded } = await supabase
      .from("PaymentHistory")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (alreadyRecorded) {
      console.log("[Stripe Webhook] Duplicate delivery for session", session.id, "— skipping");
      return NextResponse.json({ received: true });
    }

    // The email the customer actually entered/edited on the Checkout page.
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;

    // Sub-resources live on the connected account for direct charges.
    const accountOptions = connectedAccountId ? stripeForAccount(connectedAccountId) : undefined;

    let receiptUrl: string | null = null;
    if (typeof session.payment_intent === "string") {
      try {
        // Set receipt_email to the submitted address so Stripe emails the
        // customer their receipt (live mode). Doing it here — rather than at
        // session creation — means the receipt goes to whatever they entered,
        // even if they changed it on the Checkout page.
        if (customerEmail) {
          await stripe.paymentIntents.update(
            session.payment_intent,
            { receipt_email: customerEmail },
            accountOptions,
          );
        }

        // Read the hosted receipt URL from the latest charge.
        const pi = await stripe.paymentIntents.retrieve(
          session.payment_intent,
          { expand: ["latest_charge"] },
          accountOptions,
        );
        const charge = pi.latest_charge;
        if (charge && typeof charge !== "string") {
          receiptUrl = charge.receipt_url ?? null;
        }
      } catch (err) {
        console.error("Failed to set receipt email / fetch receipt URL:", err);
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
      stripe_connection_uuid: stripeConnectionId || null,
      stripe_receipt_url: receiptUrl,
      payment_method_type: session.payment_method_types?.[0] ?? "card",
      payer_name: payerName ?? "Unknown",
      payer_email: customerEmail,
      paid_at: new Date().toISOString(),
    });

    if (insertError) {
      // 23505 = unique_violation on stripe_checkout_session_id. This is the
      // race the existence check above can't close: two identical deliveries
      // both pass the check, then one insert wins and the other lands here. The
      // payment is already recorded, so acknowledge with 200 and stop — do NOT
      // let Stripe retry.
      if (insertError.code === "23505") {
        console.log(
          "[Stripe Webhook] Concurrent duplicate for session",
          session.id,
          "— already recorded, skipping",
        );
        return NextResponse.json({ received: true });
      }

      // Any other failure is a genuine problem (transient DB error, etc.).
      // Return 500 so Stripe retries the delivery rather than silently losing
      // the payment record.
      console.error("[Stripe Webhook] PaymentHistory insert failed:", insertError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    console.log(
      "[Stripe Webhook] PaymentHistory inserted for event:",
      eventId,
      "amount:",
      session.amount_total,
    );

    if (installmentId) {
      const { error: updateError } = await supabase
        .from("PaymentInstallments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", installmentId);

      if (updateError) {
        console.error("[Stripe Webhook] Installment update failed:", updateError);
      } else {
        console.log("[Stripe Webhook] Installment marked paid:", installmentId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
