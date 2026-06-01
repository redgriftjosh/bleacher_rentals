import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/features/userAccess/logic/requireAuth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for collecting a payment.
 *
 * Body:
 *   amountCents  – integer, amount in cents (e.g. 5000 = $50.00)
 *   currency     – "usd" or "cad" (default "usd")
 *   description  – (optional) line item description
 *   customerEmail – (optional) pre-fill customer email on checkout
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const { amountCents, currency: rawCurrency, description, customerEmail } = body;

    const VALID_CURRENCIES = ["usd", "cad"] as const;
    const currency = VALID_CURRENCIES.includes(rawCurrency?.toLowerCase())
      ? (rawCurrency.toLowerCase() as "usd" | "cad")
      : "usd";

    if (!amountCents || typeof amountCents !== "number" || amountCents < 50) {
      return NextResponse.json(
        { error: "amountCents is required and must be at least 50 (= $0.50)" },
        { status: 400 },
      );
    }

    const origin = req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(amountCents),
            product_data: {
              name: description || "Payment",
            },
          },
          quantity: 1,
        },
      ],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: `${origin}/dev-tools/stripe-checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dev-tools/stripe-checkout?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
