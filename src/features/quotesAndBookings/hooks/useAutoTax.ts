"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useCreateQuoteStore } from "../state/useCreateQuoteStore";
import { fetchTaxPercent } from "../db/fetchTaxPercent";
import { isCanadianProvince } from "../utils/canadianTaxRates";
import { useSalesOffices } from "./useSalesOffices";

/** Which way a sales office and event address disagree on country. */
export type CountryMismatch = "cad-office-us-address" | "usd-office-ca-address" | null;

export function useAutoTax() {
  const salesOfficeId = useCreateQuoteStore((s) => s.salesOfficeId);
  const eventAddressData = useCreateQuoteStore((s) => s.eventAddressData);
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const setField = useCreateQuoteStore((s) => s.setField);
  const [qboError, setQboError] = useState(false);
  const [countryMismatch, setCountryMismatch] = useState<CountryMismatch>(null);

  const { salesOffices } = useSalesOffices();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subtotal = useMemo(
    () =>
      lineItems
        .filter((i) => i.category !== "discounts")
        .reduce((sum, i) => sum + i.lineTotalCents, 0),
    [lineItems],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!salesOfficeId || !eventAddressData) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      setQboError(false);
      setCountryMismatch(null);
      return;
    }

    const office = salesOffices.find((o) => o.id === salesOfficeId);
    if (!office?.quickbookUuid) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      setQboError(false);
      setCountryMismatch(null);
      return;
    }

    if (!eventAddressData.street && !eventAddressData.city && !eventAddressData.stateProvince) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      setQboError(false);
      setCountryMismatch(null);
      return;
    }

    // Tax follows place of supply, so a Canadian event address uses Canadian
    // rates even from a US office. But the quote is billed in the office's
    // currency and lands in that office's QBO file, so a cross-border pairing
    // is a data-entry mistake rather than something to silently price.
    const officeIsCanadian = isCanadianProvince(office.stateProvince);
    const eventIsCanadian = isCanadianProvince(eventAddressData.stateProvince);
    if (eventAddressData.stateProvince && officeIsCanadian !== eventIsCanadian) {
      setField("taxPercent", null);
      setField("taxLoading", false);
      setQboError(false);
      setCountryMismatch(officeIsCanadian ? "cad-office-us-address" : "usd-office-ca-address");
      return;
    }
    setCountryMismatch(null);

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
          setQboError(false);
        } else {
          setField("taxPercent", null);
          setQboError(true);
        }
      } catch (e) {
        console.error("Auto-tax fetch failed:", e);
        setField("taxPercent", null);
        setQboError(true);
      } finally {
        setField("taxLoading", false);
      }
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [salesOfficeId, eventAddressData, subtotal, salesOffices, setField]);

  return { qboError, countryMismatch };
}
