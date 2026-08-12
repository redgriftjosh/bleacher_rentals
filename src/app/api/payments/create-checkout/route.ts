import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Database } from "../../../../../database.types";
import { getEventStripeConfiguration } from "@/features/stripe-integration/getEventStripeConfiguration";
import { stripeForAccount } from "@/features/stripe-integration/util";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, installmentId, amountCents, currency, payerName } = body;

  if (!eventId || !amountCents || !payerName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: event } = await supabase
    .from("Events")
    .select("id, event_name, invoice_number")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Resolve which connected Stripe account this event's payments route to
  // (event -> sales office -> Stripe connection). Payments are charged on the
  // office's own account, not the platform account.
  const stripeConfig = await getEventStripeConfiguration(supabase, eventId);
  if (!stripeConfig.ok) {
    return NextResponse.json({ error: stripeConfig.error }, { status: stripeConfig.status });
  }

  const origin = req.nextUrl.origin;
  const invoiceLabel = event.invoice_number ? `#${event.invoice_number}` : event.id.slice(0, 8);

  if (amountCents < 50) {
    return NextResponse.json({ error: "Payment amount must be at least $0.50." }, { status: 400 });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      mode: "payment",
      // Email is intentionally NOT prefilled: passing customer_email locks the
      // field on the Checkout page. We let the customer enter/edit it, then the
      // webhook sends the receipt to the address they actually submit.
      line_items: [
        {
          price_data: {
            currency: (currency ?? "USD").toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name: `Invoice ${invoiceLabel} — ${event.event_name ?? "Bleacher Rental"}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        eventId,
        installmentId: installmentId ?? "",
        payerName,
        stripeConnectionId: stripeConfig.config.connectionId,
      },
      success_url: `${origin}/quote/${eventId}?payment=success`,
      cancel_url: `${origin}/quote/${eventId}?payment=cancelled`,
    },
    // Create the session ON the office's connected account (direct charge), so
    // the funds land in that account rather than the platform account.
    stripeForAccount(stripeConfig.config.stripeAccountId),
  );

  return NextResponse.json({ url: session.url });
}
