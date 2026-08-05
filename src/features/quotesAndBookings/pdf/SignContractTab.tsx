"use client";

import { useState, useEffect } from "react";
import { QuoteDocumentData } from "./quoteDocumentData";
import { TrackEvent } from "./useQuoteActivityTracker";

type ContractData = {
  termsAndConditionsUuid: string | null;
  termsHtml: string | null;
  signature: {
    id: string;
    signerName: string;
    signedAt: string;
  } | null;
};

export function formatSignedAt(iso: string): string {
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  return d.toLocaleString("en-US", options);
}

export function SignContractTab({
  data,
  track,
  onQuoteChanged,
}: {
  data: QuoteDocumentData;
  track: (e: TrackEvent) => void;
  onQuoteChanged?: () => void;
}) {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    fetch(`/api/contracts/${data.eventId}`)
      .then((r) => r.json())
      .then(setContract)
      .finally(() => setLoading(false));
  }, [data.eventId]);

  const handleSign = async () => {
    if (!signerName.trim() || !contract?.termsAndConditionsUuid) return;
    setSigning(true);
    try {
      const res = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: data.eventId,
          termsAndConditionsUuid: contract.termsAndConditionsUuid,
          signerName: signerName.trim(),
          // Sign-time guard: the server rejects (409) if the quote changed since load.
          expectedContractHash: data.contractHash,
        }),
      });
      if (res.status === 409) {
        // Quote changed underneath the client — do not record; prompt a refresh.
        onQuoteChanged?.();
        return;
      }
      const result = await res.json();
      if (res.ok) {
        track({
          action_type: "client_contract_signed",
          field_name: "contract",
          next_value: signerName.trim(),
        });
        setContract((prev) =>
          prev
            ? {
                ...prev,
                signature: {
                  id: result.signatureId,
                  signerName: signerName.trim(),
                  signedAt: result.signedAt,
                },
              }
            : prev,
        );
      }
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center text-gray-500">
        Loading contract...
      </div>
    );
  }

  if (!contract?.termsHtml) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center text-gray-400">
        No contract template has been assigned to this quote.
      </div>
    );
  }

  const isSigned = !!contract.signature;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Contract HTML content */}
        <div className="px-4 sm:px-8 py-6 overflow-x-auto">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contract.termsHtml }}
          />
        </div>

        {/* Signature section */}
        <div className="px-4 sm:px-8 py-6 border-t">
          {!isSigned ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your full name to sign this contract
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full max-w-md border rounded px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Live preview */}
              {signerName.trim() && (
                <div className="border rounded-lg overflow-hidden max-w-lg">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-3 font-medium text-gray-600 w-36 bg-gray-50">
                          Signature
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-2xl"
                            style={{ fontFamily: "var(--font-dancing-script), cursive" }}
                          >
                            {signerName}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">
                          Printed Name
                        </td>
                        <td className="px-4 py-3">{signerName}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">
                          Timestamp
                        </td>
                        <td className="px-4 py-3 text-gray-400 italic">Will be recorded on sign</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={handleSign}
                disabled={signing || !signerName.trim()}
                className="px-6 py-2.5 bg-[#405daa] text-white text-base font-semibold rounded hover:bg-[#10365a] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {signing ? "Signing..." : "Sign Contract"}
              </button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden max-w-lg">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3 font-medium text-gray-600 w-36 bg-gray-50">
                      Signature
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-2xl"
                        style={{ fontFamily: "var(--font-dancing-script), cursive" }}
                      >
                        {contract.signature!.signerName}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">Printed Name</td>
                    <td className="px-4 py-3">{contract.signature!.signerName}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-600 bg-gray-50">Timestamp</td>
                    <td className="px-4 py-3">{formatSignedAt(contract.signature!.signedAt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
