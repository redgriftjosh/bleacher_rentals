"use client";

import { useEffect, useRef } from "react";
import { useCreateQuoteStore } from "../state/useCreateQuoteStore";
import { fetchTaxPercent } from "../db/fetchTaxPercent";
import { useSalesOffices } from "./useSalesOffices";

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

  const { salesOffices } = useSalesOffices();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subtotal = lineItems
    .filter((i) => i.category !== "discounts")
    .reduce((sum, i) => sum + i.lineTotalCents, 0);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!salesOfficeId || !eventAddressData) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      return;
    }

    const office = salesOffices.find((o) => o.id === salesOfficeId);
    if (!office?.quickbookUuid) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      return;
    }

    if (!eventAddressData.street && !eventAddressData.city && !eventAddressData.stateProvince) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      return;
    }

    setField("taxLoading", true);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await fetchTaxPercent({
          connectionId: office.quickbookUuid!,
          address: eventAddressData,
          subtotal: subtotal > 0 ? subtotal / 100 : 100,
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
  }, [salesOfficeId, eventAddressData, subtotal, salesOffices, setField]);
}
