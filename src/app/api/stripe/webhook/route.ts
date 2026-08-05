import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordPaymentHistoryFromCheckoutSession } from "@/app/api/payments/_lib/recordPaymentHistory";

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
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[Stripe Webhook] Received event:", event.type, event.id);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = getSupabaseAdmin();

    const result = await recordPaymentHistoryFromCheckoutSession(session, {
      stripe,
      supabase,
    });

    if (!result.ok) {
      // Non-2xx (e.g. DB insert error) makes Stripe retry rather than drop the record.
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
  }

  return NextResponse.json({ received: true });
}
