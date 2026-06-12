import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { eventId, installmentId, payerName } = session.metadata ?? {};

    if (!eventId) {
      return NextResponse.json({ error: "No eventId in metadata" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    await supabase.from("PaymentHistory").insert({
      event_uuid: eventId,
      installment_id: installmentId || null,
      amount_cents: session.amount_total ?? 0,
      currency: (session.currency ?? "usd").toUpperCase(),
      status: "succeeded",
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_checkout_session_id: session.id,
      payment_method_type: session.payment_method_types?.[0] ?? "card",
      payer_name: payerName ?? "Unknown",
      payer_email: session.customer_email ?? null,
      paid_at: new Date().toISOString(),
    });

    if (installmentId) {
      await supabase
        .from("PaymentInstallments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", installmentId);
    }
  }

  return NextResponse.json({ received: true });
}
