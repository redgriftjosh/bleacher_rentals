"use client";

import { QuoteDetail } from "../../../db/fetchQuoteDetail";
import { useEventLineItems, EventLineItemRow } from "../../../hooks/useEventLineItems";
import { DateTime } from "luxon";
import { useMemo } from "react";

function formatDate(d: string | null): string {
  if (!d) return "N/A";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy") : "N/A";
}

function formatCurrency(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const str = `$${(abs / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return negative ? `-${str}` : str;
}

function LineItemsTable({ lineItems }: { lineItems: EventLineItemRow[] }) {
  const { subtotalCents, discountsCents, totalCents } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    for (const li of lineItems) {
      const lineTotal = li.valueCents * li.quantity;
      if (lineTotal < 0) {
        disc += lineTotal;
      } else {
        sub += lineTotal;
      }
    }
    return { subtotalCents: sub, discountsCents: disc, totalCents: sub + disc };
  }, [lineItems]);

  if (lineItems.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center border rounded">
        No line items yet. Edit the quote to add rental items.
      </p>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">Unit Price</th>
            <th className="py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li) => {
            const lineTotal = li.valueCents * li.quantity;
            const isDiscount = lineTotal < 0;
            return (
              <tr key={li.id} className={`border-b ${isDiscount ? "text-red-600" : ""}`}>
                <td className="py-2">
                  <span className="font-medium">{li.header}</span>
                  {li.bleacherTypeName && (
                    <span className="text-gray-400 ml-1 text-xs">({li.bleacherTypeName})</span>
                  )}
                  {li.description && (
                    <span className="block text-xs text-gray-400">{li.description}</span>
                  )}
                </td>
                <td className="py-2 text-right">{li.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(li.valueCents)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium w-24 text-right">{formatCurrency(subtotalCents)}</span>
        </div>
        {discountsCents !== 0 && (
          <div className="flex gap-8 text-red-600">
            <span>Discounts</span>
            <span className="font-medium w-24 text-right">{formatCurrency(discountsCents)}</span>
          </div>
        )}
        <div className="flex gap-8 border-t pt-1 mt-1">
          <span className="font-semibold">Total</span>
          <span className="font-bold w-24 text-right">{formatCurrency(totalCents)}</span>
        </div>
      </div>
    </div>
  );
}

export function ContractTab({ quote }: { quote: QuoteDetail }) {
  const { lineItems, isLoading } = useEventLineItems(quote.id);

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Project Info</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Event Name:</span>{" "}
              <span className="font-medium">{quote.eventName}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>{" "}
              <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                quote.eventStatus === "booked" ? "bg-green-100 text-green-800" :
                quote.eventStatus === "quoted" ? "bg-yellow-100 text-yellow-800" :
                quote.eventStatus === "lost" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {quote.eventStatus ?? "Unknown"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Account Manager:</span>{" "}
              <span className="font-medium">
                {quote.accountManager
                  ? `${quote.accountManager.firstName ?? ""} ${quote.accountManager.lastName ?? ""}`.trim()
                  : "Not Assigned"}
              </span>
            </div>
            {quote.quoteValidTill && (
              <div>
                <span className="text-gray-500">Quote Valid Till:</span>{" "}
                <span className="font-medium">{formatDate(quote.quoteValidTill)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            {quote.contact && (
              <>
                <div>
                  <span className="text-gray-500">Contact:</span>{" "}
                  <span className="font-medium text-darkBlue">
                    {quote.contact.firstName} {quote.contact.lastName ?? ""}
                  </span>
                </div>
                {quote.contact.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span>{quote.contact.email}</span>
                  </div>
                )}
                {quote.contact.phone && (
                  <div>
                    <span className="text-gray-500">Phone:</span>{" "}
                    <span>{quote.contact.phone}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Venue */}
      {quote.address && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Venue</h3>
          <p className="text-sm">
            {quote.address.street}
            <br />
            {quote.address.city}, {quote.address.stateProvince} {quote.address.zipPostal ?? ""}
          </p>
        </div>
      )}

      {/* Dates */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Dates</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Event Start</span>
            <span className="font-medium">{formatDate(quote.eventStart)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Event End</span>
            <span className="font-medium">{formatDate(quote.eventEnd)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(quote.notes || quote.externalNotes) && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Notes</h3>
          {quote.externalNotes && (
            <p className="text-sm mb-2">{quote.externalNotes}</p>
          )}
          {quote.notes && !quote.externalNotes && (
            <p className="text-sm">{quote.notes}</p>
          )}
        </div>
      )}

      {/* Rental Items */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Rental Items</h3>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading line items...</p>
        ) : (
          <LineItemsTable lineItems={lineItems} />
        )}
      </div>
    </div>
  );
}
