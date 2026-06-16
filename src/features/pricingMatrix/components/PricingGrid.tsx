"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { usePricesForType, useEventTypesActive, usePriceDurationsActive } from "../hooks/usePricingMatrix";
import { savePricesForType, PriceEntry } from "../db/priceCrud";
import { buildMatrixKey, buildPriceMap, centsToDollars, dollarsToCents, MatrixKey } from "../utils/priceUtils";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

const CURRENCIES = ["USD", "CAD"] as const;

export function PricingGrid({ bleacherTypeId }: { bleacherTypeId: string }) {
  const supabase = useClerkSupabaseClient();
  const { prices, isLoading: pricesLoading } = usePricesForType(bleacherTypeId);
  const { eventTypes, isLoading: etLoading } = useEventTypesActive();
  const { durations, isLoading: pdLoading } = usePriceDurationsActive();
  const [grid, setGrid] = useState<Map<MatrixKey, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (pricesLoading || initialized) return;
    const priceMap = buildPriceMap(prices);
    const newGrid = new Map<MatrixKey, string>();
    priceMap.forEach((cents, key) => {
      newGrid.set(key, centsToDollars(cents));
    });
    setGrid(newGrid);
    setInitialized(true);
  }, [prices, pricesLoading, initialized]);

  const setCellValue = useCallback((key: MatrixKey, value: string) => {
    setGrid((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries: PriceEntry[] = [];
      grid.forEach((dollars, key) => {
        const [durationId, eventTypeId, currency] = key.split(":") as [string, string, string];
        const cents = dollarsToCents(dollars);
        if (cents > 0) {
          entries.push({
            priceDurationUuid: durationId,
            eventTypeUuid: eventTypeId,
            currency: currency as "USD" | "CAD",
            priceCents: cents,
          });
        }
      });
      await savePricesForType(bleacherTypeId, entries, supabase);
      createSuccessToast(["Prices saved successfully."]);
    } catch (err: any) {
      createErrorToast(["Failed to save prices", err?.message ?? ""]);
    } finally {
      setSaving(false);
    }
  };

  if (pricesLoading || etLoading || pdLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (eventTypes.length === 0 || durations.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No event types or durations configured.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pricing Matrix</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-semibold text-white bg-darkBlue rounded px-3 py-1.5 hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saving ? "Saving..." : "Save Prices"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-2 pr-3 font-medium">Event Type</th>
              <th className="pb-2 pr-3 font-medium">Currency</th>
              {durations.map((d) => (
                <th key={d.id} className="pb-2 px-2 font-medium text-center whitespace-nowrap">
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventTypes.map((et) =>
              CURRENCIES.map((cur, ci) => (
                <tr
                  key={`${et.id}-${cur}`}
                  className={`border-b border-gray-100 ${ci === 0 ? "border-t border-gray-200" : ""}`}
                >
                  {ci === 0 && (
                    <td rowSpan={2} className="py-2 pr-3 font-medium text-gray-700 align-middle">
                      {et.name}
                    </td>
                  )}
                  <td className="py-2 pr-3 text-gray-500 text-xs">{cur}</td>
                  {durations.map((d) => {
                    const key = buildMatrixKey(d.id, et.id, cur);
                    const value = grid.get(key) ?? "";
                    return (
                      <td key={d.id} className="py-1 px-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => setCellValue(key, e.target.value)}
                          placeholder="0.00"
                          className="w-full min-w-[80px] px-2 py-1.5 text-sm border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-darkBlue"
                        />
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
