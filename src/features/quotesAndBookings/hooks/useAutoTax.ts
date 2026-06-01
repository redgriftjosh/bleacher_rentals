"use client";

import { useEffect, useRef } from "react";
import { useCreateQuoteStore } from "../state/useCreateQuoteStore";
import { fetchTaxPercent } from "../db/fetchTaxPercent";
import { fetchSalesOffices, SalesOfficeOption } from "../db/fetchSalesOffices";

/**
 * Automatically fetches tax percent from QBO when:
 * - A sales office is selected (has quickbook_uuid)
 * - An event address is set
 * - Line items change (subtotal changes)
 *
 * Debounces calls to avoid hammering the API.
 */
export function useAutoTax() {
  const salesOfficeId = useCreateQuoteStore((s) => s.salesOfficeId);
  const eventAddressData = useCreateQuoteStore((s) => s.eventAddressData);
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const setField = useCreateQuoteStore((s) => s.setField);

  const officesCacheRef = useRef<SalesOfficeOption[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate subtotal for non-discount items
  const subtotal = lineItems
    .filter((i) => i.category !== "discounts")
    .reduce((sum, i) => sum + i.lineTotal, 0);

  useEffect(() => {
    // Load offices cache once
    fetchSalesOffices().then((offices) => {
      officesCacheRef.current = offices;
    });
  }, []);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // No office or no address — reset tax
    if (!salesOfficeId || !eventAddressData) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      return;
    }

    // Find quickbook_uuid for selected office
    const office = officesCacheRef.current.find((o) => o.id === salesOfficeId);
    if (!office?.quickbookUuid) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      return;
    }

    // Need at least some address data
    if (!eventAddressData.street && !eventAddressData.city && !eventAddressData.stateProvince) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      return;
    }

    // Debounce 500ms
    setField("taxLoading", true);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await fetchTaxPercent({
          connectionId: office.quickbookUuid!,
          address: eventAddressData,
          subtotal: subtotal > 0 ? subtotal : 100,
        });

        if (result) {
          setField("taxPercent", result.taxPercent);
        } else {
          setField("taxPercent", null);
        }
      } catch (e) {
        console.error("Auto-tax fetch failed:", e);
        setField("taxPercent", null);
      } finally {
        setField("taxLoading", false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [salesOfficeId, eventAddressData, subtotal, setField]);
}
