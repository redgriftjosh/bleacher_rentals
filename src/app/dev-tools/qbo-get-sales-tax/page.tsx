"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchQboConnections, type QboConnection } from "@/features/quickbooks-integration/api";
import AddressAutocomplete from "@/components/AddressAutoComplete";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Loader2 } from "lucide-react";

type AddressData = {
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

type TaxResult = {
  taxPercent: number;
  totalTax: number;
  subtotal: number;
  totalWithTax: number;
  taxLines: {
    amount: number;
    netAmountTaxable: number;
    taxPercent: number;
    taxRateRef: string;
  }[];
  address: Record<string, string>;
  customerUsed: { id: string; name: string };
  taxMode?: "automated" | "manual";
  taxModeNote?: string;
  debug?: Record<string, any>;
};

export default function QboGetSalesTaxPage() {
  const [connectionId, setConnectionId] = useState("");
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [subtotal, setSubtotal] = useState("100");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["qbo-connections"],
    queryFn: fetchQboConnections,
  });

  const canSubmit = connectionId && addressData && !loading;

  const handleCalculate = async () => {
    if (!connectionId || !addressData) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setErrorDetails(null);

    try {
      const params = new URLSearchParams();
      params.set("connectionId", connectionId);
      if (addressData.address) params.set("line1", addressData.address);
      if (addressData.city) params.set("city", addressData.city);
      if (addressData.state) params.set("state", addressData.state);
      if (addressData.postalCode) params.set("postalCode", addressData.postalCode);
      if (subtotal) params.set("subtotal", subtotal);

      const res = await fetch(`/api/quickbooks/tax-percent?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to calculate tax");
        setErrorDetails({ details: data.details, debug: data.debug, status: res.status });
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="QBO Sales Tax Lookup"
        subtitle="Calculate sales tax % for an address using QuickBooks Automated Sales Tax"
      />

      <div className="space-y-4">
        {/* Connection Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QBO Company
          </label>
          {connectionsLoading ? (
            <p className="text-sm text-gray-400">Loading connections...</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-red-500">
              No QBO connections found.{" "}
              <a href="/quickbooks" className="underline">
                Set one up first.
              </a>
            </p>
          ) : (
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
            >
              <option value="">Select a company...</option>
              {connections.map((c: QboConnection) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                  {c.realm_id ? ` (${c.realm_id})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shipping Address
          </label>
          <AddressAutocomplete
            onAddressSelect={(data) => setAddressData(data)}
            className="text-sm"
          />
          {addressData && (
            <p className="mt-1 text-xs text-gray-400">
              {[addressData.city, addressData.state, addressData.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        {/* Subtotal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Subtotal ($)
          </label>
          <input
            type="number"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            min="0.01"
            step="0.01"
            className="w-40 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Amount used to calculate tax. Default $100 makes the tax amount equal the percentage.
          </p>
        </div>

        {/* Submit */}
        <Button onClick={handleCalculate} disabled={!canSubmit}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            "Calculate Sales Tax"
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
            <p className="text-sm font-medium text-red-700">{error}</p>
            {errorDetails && (
              <details open>
                <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-red-100 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap text-red-800">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            {/* Tax Mode Banner */}
            {result.taxMode === "manual" && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-semibold">⚠ Manual Tax Mode</span> —{" "}
                {result.taxModeNote}
              </div>
            )}
            {result.taxMode === "automated" && (
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                <span className="font-semibold">✓ Automated Sales Tax</span> — rate calculated by
                address via QBO AST engine.
              </div>
            )}

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-darkBlue">
                {result.taxPercent.toFixed(4)}%
              </span>
              <span className="text-sm text-gray-400">sales tax</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-400 block">Subtotal</span>
                <span className="font-medium">${result.subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Tax</span>
                <span className="font-medium">${result.totalTax.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Total</span>
                <span className="font-medium">${result.totalWithTax.toFixed(2)}</span>
              </div>
            </div>

            {result.taxLines.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Tax Breakdown
                </span>
                <table className="w-full mt-1 text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="py-1">Rate Ref</th>
                      <th className="py-1">Rate %</th>
                      <th className="py-1">Taxable Amt</th>
                      <th className="py-1">Tax Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.taxLines.map((tl, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1">{tl.taxRateRef}</td>
                        <td className="py-1">{tl.taxPercent}%</td>
                        <td className="py-1">${tl.netAmountTaxable?.toFixed(2) ?? "—"}</td>
                        <td className="py-1">${tl.amount?.toFixed(2) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              Customer used: {result.customerUsed.name} (ID: {result.customerUsed.id})
            </div>

            {/* Debug Panel */}
            {result.debug && (
              <details className="pt-2 border-t border-gray-100">
                <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
                  Debug Info (click to expand)
                </summary>
                <pre className="mt-2 text-xs bg-gray-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(result.debug, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
