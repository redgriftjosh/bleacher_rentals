"use client";

import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import successAnimation from "../../../../public/animations/Success.json";
import type { QuoteLanguage } from "./quoteLanguage";
import { quoteText } from "./quoteStrings";
import { readStoredQuoteLanguage } from "./quoteLanguageStorage";

/**
 * Landing page the customer sees after Stripe Checkout redirects back on a
 * successful payment. Deliberately standalone (not the quote/pay tab) so the
 * confirmation is unambiguous — the only action is returning to the quote.
 */
export function PaymentSuccessView({
  eventUUID,
  language = "en",
}: {
  eventUUID: string;
  language?: QuoteLanguage;
}) {
  // Stripe redirects here on its own route, so pick up the same correction the
  // client made on the quote page. Read after mount to keep SSR and the first
  // client render identical.
  const [active, setActive] = useState(language);
  useEffect(() => {
    const stored = readStoredQuoteLanguage(eventUUID);
    if (stored) setActive(stored);
  }, [eventUUID]);

  const s = quoteText(active);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-lg p-8 text-center">
        <Lottie
          animationData={successAnimation}
          loop={false}
          style={{ width: 160, height: 160 }}
          className="mx-auto"
        />
        <h1 className="text-xl font-semibold text-gray-900">{s.paymentSuccessful}</h1>
        <p className="mt-2 text-sm text-gray-500">{s.paymentSuccessDetail}</p>
        <a
          href={`/quote/${eventUUID}`}
          className="mt-6 inline-block w-full rounded-lg bg-[#405daa] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#10365a]"
        >
          {s.backToQuote}
        </a>
      </div>
    </div>
  );
}
