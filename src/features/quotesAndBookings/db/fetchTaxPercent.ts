import { AddressFields } from "../types/quoteTypes";

type FetchTaxPercentParams = {
  connectionId: string;
  address: AddressFields;
  subtotal: number;
};

type TaxPercentResponse = {
  taxPercent: number;
  totalTax: number;
  subtotal: number;
  taxMode: "automated" | "manual";
};

/**
 * Calls /api/quickbooks/tax-percent to get the tax rate
 * based on the QBO connection and event address.
 */
export async function fetchTaxPercent(
  params: FetchTaxPercentParams,
): Promise<TaxPercentResponse | null> {
  const { connectionId, address, subtotal } = params;

  if (!connectionId || (!address.street && !address.city && !address.stateProvince)) {
    return null;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("connectionId", connectionId);
  if (address.street) searchParams.set("line1", address.street);
  if (address.city) searchParams.set("city", address.city);
  if (address.stateProvince) searchParams.set("state", address.stateProvince);
  if (address.zipPostal) searchParams.set("postalCode", address.zipPostal);
  if (subtotal > 0) searchParams.set("subtotal", subtotal.toString());

  try {
    const res = await fetch(`/api/quickbooks/tax-percent?${searchParams.toString()}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Failed to fetch tax percent:", err);
      return null;
    }

    const data = await res.json();
    return {
      taxPercent: data.taxPercent,
      totalTax: data.totalTax,
      subtotal: data.subtotal,
      taxMode: data.taxMode,
    };
  } catch (e) {
    console.error("Failed to fetch tax percent:", e);
    return null;
  }
}
