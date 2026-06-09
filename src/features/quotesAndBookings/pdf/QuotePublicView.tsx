import { QuoteDocumentData } from "./quoteDocumentData";

function formatMoney(cents: number, currency: "USD" | "CAD"): string {
  const symbol = currency === "CAD" ? "C$" : "$";
  const formatted = (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function formatDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Server component — renders the quote as HTML for the public page.
 * Uses the same QuoteDocumentData as PDF and email (single source of truth).
 */
export function QuotePublicView({ data }: { data: QuoteDocumentData }) {
  const { currency } = data;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="bg-darkBlue text-white px-8 py-6 rounded-t-lg flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{data.company.name}</h1>
          {data.company.address && (
            <p className="text-white/70 text-sm mt-1">{data.company.address}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">QUOTE</p>
          <p className="text-white/70 text-sm">{data.quoteNumber}</p>
          <p className="text-white/70 text-sm">Date: {formatDate(data.quoteDate)}</p>
          {data.validUntil && (
            <p className="text-white/70 text-sm">Valid until: {formatDate(data.validUntil)}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-t-0 rounded-b-lg">
        <div className="px-8 py-6 space-y-8">
          {/* Contact + Venue + AM */}
          <div className="grid grid-cols-3 gap-6">
            {data.contact && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Bill To</p>
                <p className="font-semibold text-sm">{data.contact.name}</p>
                {data.contact.email && (
                  <p className="text-sm text-gray-600">{data.contact.email}</p>
                )}
                {data.contact.phone && (
                  <p className="text-sm text-gray-600">{data.contact.phone}</p>
                )}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Event Venue</p>
              <p className="font-semibold text-sm">{data.venue.name}</p>
              {data.venue.street && (
                <p className="text-sm text-gray-600">
                  {data.venue.street}
                  <br />
                  {data.venue.city}, {data.venue.state} {data.venue.zip}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Account Manager</p>
              <p className="font-semibold text-sm">{data.accountManager || "—"}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
            {[
              { label: "Event Start", value: data.dates.eventStart },
              { label: "Event End", value: data.dates.eventEnd },
            ].map((d) => (
              <div key={d.label}>
                <p className="text-xs font-bold text-gray-500 uppercase">{d.label}</p>
                <p className="text-sm font-semibold mt-1">{formatDate(d.value)}</p>
              </div>
            ))}
          </div>

          {/* Line Items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-darkBlue text-white">
                  <th className="px-3 py-2 text-left font-semibold rounded-tl">Item</th>
                  <th className="px-3 py-2 text-center font-semibold w-16">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold w-24">Price</th>
                  <th className="px-3 py-2 text-right font-semibold w-24 rounded-tr">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="block text-xs text-gray-500">{item.description}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-center">{item.qty}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-right">
                      {formatMoney(item.unitPrice, currency)}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-right font-semibold">
                      {formatMoney(item.total, currency)}
                    </td>
                  </tr>
                ))}
                {data.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      No items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{formatMoney(data.subtotalCents, currency)}</span>
              </div>
              {data.discountsCents !== 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discounts</span>
                  <span className="font-semibold">
                    {formatMoney(data.discountsCents, currency)}
                  </span>
                </div>
              )}
              {data.taxPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({data.taxPercent}%)</span>
                  <span className="font-semibold">
                    {formatMoney(data.taxAmountCents, currency)}
                  </span>
                </div>
              )}
              <div className="border-t-2 border-darkBlue pt-2 flex justify-between">
                <span className="text-lg font-bold text-darkBlue">TOTAL</span>
                <span className="text-lg font-bold text-darkBlue">
                  {formatMoney(data.totalCents, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          {data.paymentSchedule.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-darkBlue mb-3">Payment Schedule</h3>
              <div className="space-y-1">
                {data.paymentSchedule.map((p, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm py-1 border-b border-gray-100"
                  >
                    <span>{formatDate(p.dueDate)}</span>
                    <span className="font-semibold">{formatMoney(p.amountCents, currency)}</span>
                    <span className={p.status === "paid" ? "text-green-600" : "text-gray-500"}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {data.clientNotes && (
            <div>
              <h3 className="text-sm font-bold text-darkBlue mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.clientNotes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-8 py-4 bg-gray-50 border-t flex items-center justify-between rounded-b-lg">
          <p className="text-xs text-gray-400">
            {data.company.name} &middot; {data.quoteNumber}
          </p>
          <a
            href={`/api/quotes/${data.eventId}/pdf`}
            className="px-4 py-2 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm hover:bg-blue-50 transition"
          >
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
