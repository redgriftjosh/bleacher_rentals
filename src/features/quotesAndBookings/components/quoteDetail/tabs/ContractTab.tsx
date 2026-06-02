"use client";

import { QuoteDetail } from "../../../db/fetchQuoteDetail";
import { DateTime } from "luxon";

function formatDate(d: string | null): string {
  if (!d) return "N/A";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy") : "N/A";
}

export function ContractTab({ quote }: { quote: QuoteDetail }) {
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

      {/* Rental Items placeholder */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Rental Items</h3>
        <p className="text-sm text-gray-400 py-4 text-center border rounded">
          Line items will be displayed here once EventLineItems are connected.
        </p>
      </div>
    </div>
  );
}
