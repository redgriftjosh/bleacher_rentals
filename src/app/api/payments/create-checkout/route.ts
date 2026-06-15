import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
  const body = await req.json();
  const { eventId, installmentId, amountCents, currency, payerName, payerEmail } = body;

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

  const origin = req.nextUrl.origin;
  const invoiceLabel = event.invoice_number
    ? `#${event.invoice_number}`
    : event.id.slice(0, 8);

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: payerEmail || undefined,
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
    },
    success_url: `${origin}/quote/${event.invoice_number ?? eventId}?payment=success`,
    cancel_url: `${origin}/quote/${event.invoice_number ?? eventId}?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
