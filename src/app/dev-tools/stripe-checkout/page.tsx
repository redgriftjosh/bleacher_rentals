"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getStripe } from "@/lib/stripeClient";

export default function StripeCheckoutPage() {
  const [amount, setAmount] = useState("50.00");
  const [description, setDescription] = useState("Test Payment");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "cancelled">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Check URL params for return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    const sid = params.get("session_id");
    if (s === "success") {
      setStatus("success");
      if (sid) setSessionId(sid);
      window.history.replaceState({}, "", "/dev-tools/stripe-checkout");
    } else if (s === "cancelled") {
      setStatus("cancelled");
      window.history.replaceState({}, "", "/dev-tools/stripe-checkout");
    }
  }, []);

  const handleCheckout = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 50) {
      setError("Amount must be at least $0.50");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("idle");

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: cents,
          description: description || undefined,
          customerEmail: email || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create checkout session");
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback: use Stripe.js redirect
        const stripe = await getStripe();
        if (stripe) {
          const { error: stripeError } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });
          if (stripeError) {
            setError(stripeError.message || "Stripe redirect failed");
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Stripe Checkout"
        subtitle="Create a Stripe Checkout session to collect a test payment"
      />

      {/* Success Banner */}
      {status === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Payment successful!</p>
            {sessionId && (
              <p className="text-xs text-green-600 mt-1 font-mono">Session: {sessionId}</p>
            )}
          </div>
        </div>
      )}

      {/* Cancelled Banner */}
      {status === "cancelled" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">Checkout was cancelled.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.50"
              step="0.01"
              className="w-full rounded border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum $0.50</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Payment description..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Email <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
          />
          <p className="text-xs text-gray-400 mt-1">Pre-fills the email on the Stripe checkout page</p>
        </div>

        {/* Submit */}
        <Button onClick={handleCheckout} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating session...
            </>
          ) : (
            `Pay $${parseFloat(amount || "0").toFixed(2)}`
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600">Setup</p>
          <p>
            Add these to <code className="bg-gray-200 px-1 rounded">.env.local</code>:
          </p>
          <pre className="bg-gray-200 rounded p-2 text-xs overflow-x-auto">
{`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...`}
          </pre>
          <p>
            Get keys from{" "}
            <a
              href="https://dashboard.stripe.com/test/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500"
            >
              Stripe Dashboard → API Keys
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
