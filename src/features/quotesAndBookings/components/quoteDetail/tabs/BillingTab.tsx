"use client";

import { QuoteDetail } from "../../../db/fetchQuoteDetail";

function formatCurrency(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const str = `$${(abs / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return negative ? `-${str}` : str;
}

export function BillingTab({ quote, contractTotalCents }: { quote: QuoteDetail; contractTotalCents: number }) {
  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Summary</h3>
        <div className="space-y-2 text-sm max-w-md">
          <div className="flex justify-between">
            <span>Contract Total</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatCurrency(contractTotalCents)}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                quote.eventStatus === "booked" ? "bg-green-100 text-green-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {quote.eventStatus ?? "Draft"}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Payments Received</span>
            <span className="font-semibold">$0.00</span>
          </div>
          <div className="flex justify-between text-red-600 border-t pt-2">
            <span className="font-medium">Balance Due</span>
            <span className="font-bold">{formatCurrency(contractTotalCents)}</span>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Invoices</h3>
          <button className="text-xs font-medium text-darkBlue border border-darkBlue rounded px-2 py-1 hover:bg-blue-50 transition cursor-pointer">
            + Create Invoice
          </button>
        </div>
        <p className="text-sm text-gray-400 py-4 text-center border rounded">
          No invoices for this project yet.
        </p>
      </div>

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payment History</h3>
          <button className="text-xs font-medium text-darkBlue border border-darkBlue rounded px-2 py-1 hover:bg-blue-50 transition cursor-pointer">
            + Record Payment
          </button>
        </div>
        <p className="text-sm text-gray-400 py-4 text-center border rounded">
          No payments recorded yet.
        </p>
      </div>
    </div>
  );
}
