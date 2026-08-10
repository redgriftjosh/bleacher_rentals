import { getBaseUrl, getQboAccessTokenAndRealmId } from "@/features/quickbooks-integration/util";
import { requireAdminOrAccountManager } from "@/features/userAccess/logic/requireAdminOrAccountManager";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/quickbooks/tax-percent
 *
 * Creates a temporary QBO Estimate to leverage the Automated Sales Tax (AST)
 * engine, reads back the calculated tax, then deletes the estimate.
 *
 * For non-AST (manual tax) companies, falls back to the company's default
 * tax code — the rate won't be address-specific in that case.
 *
 * Query params:
 *   connectionId  – QBO connection UUID
 *   line1         – street address
 *   city          – city
 *   state         – state / province code (e.g. "CA", "ON")
 *   postalCode    – zip / postal code
 *   subtotal      – (optional) dollar amount to test against, default 100
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrAccountManager();

    const sp = req.nextUrl.searchParams;
    const connectionId = sp.get("connectionId");
    const line1 = sp.get("line1");
    const city = sp.get("city");
    const state = sp.get("state");
    const postalCode = sp.get("postalCode");
    const subtotal = parseFloat(sp.get("subtotal") || "100") || 100;

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    }
    if (!line1 && !city && !state && !postalCode) {
      return NextResponse.json(
        { error: "At least one address field is required (line1, city, state, postalCode)" },
        { status: 400 },
      );
    }

    const { accessToken, realmId } = await getQboAccessTokenAndRealmId(connectionId);
    const baseUrl = getBaseUrl();
    const debug: Record<string, any> = {};

    // ── 0. Check company tax preferences & detect AST vs manual ──
    let isAST = false;
    let defaultTaxCodeId: string | null = null;
    try {
      const prefRes = await fetch(`${baseUrl}/${realmId}/preferences?minorversion=73`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (prefRes.ok) {
        const prefData = await prefRes.json();
        const taxPrefs = prefData.Preferences?.TaxPrefs;
        debug.taxPrefs = taxPrefs;
        isAST = taxPrefs?.PartnerTaxEnabled === true;
        defaultTaxCodeId = taxPrefs?.TaxGroupCodeRef?.value ?? null;
      }
    } catch {
      debug.prefError = "Failed to fetch preferences";
    }
    debug.isAST = isAST;

    // ── 1. Find any active customer ──
    const customerQuery = encodeURIComponent(
      "SELECT * FROM Customer WHERE Active = true MAXRESULTS 1",
    );
    const customerRes = await fetch(
      `${baseUrl}/${realmId}/query?query=${customerQuery}&minorversion=73`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!customerRes.ok) {
      const err = await customerRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to query customers", details: err },
        { status: 500 },
      );
    }

    const customerData = await customerRes.json();
    const customers = customerData.QueryResponse?.Customer;
    if (!customers || customers.length === 0) {
      return NextResponse.json(
        {
          error:
            "No active customers found in this QBO company. At least one customer is needed to create a temporary estimate.",
        },
        { status: 400 },
      );
    }
    const customer = customers[0];
    const customerId = customer.Id;
    const customerName = customer.DisplayName;
    debug.customer = {
      id: customerId,
      name: customerName,
      taxable: customer.Taxable,
    };

    // ── 2. Find a valid Item ──
    let itemId: string | null = null;
    let itemName: string | null = null;
    try {
      const itemQuery = encodeURIComponent(
        "SELECT Id, Name, Type, Taxable FROM Item WHERE Active = true AND Type = 'Service' MAXRESULTS 1",
      );
      const itemRes = await fetch(
        `${baseUrl}/${realmId}/query?query=${itemQuery}&minorversion=73`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
      );
      if (itemRes.ok) {
        const itemData = await itemRes.json();
        const items = itemData.QueryResponse?.Item;
        if (items && items.length > 0) {
          itemId = items[0].Id;
          itemName = items[0].Name;
          debug.item = items[0];
        }
      }
    } catch {
      debug.itemError = "Failed to query items";
    }

    // Fallback: any item
    if (!itemId) {
      try {
        const itemQuery2 = encodeURIComponent(
          "SELECT Id, Name, Type, Taxable FROM Item WHERE Active = true MAXRESULTS 1",
        );
        const itemRes2 = await fetch(
          `${baseUrl}/${realmId}/query?query=${itemQuery2}&minorversion=73`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          },
        );
        if (itemRes2.ok) {
          const itemData2 = await itemRes2.json();
          const items2 = itemData2.QueryResponse?.Item;
          if (items2 && items2.length > 0) {
            itemId = items2[0].Id;
            itemName = items2[0].Name;
            debug.item = items2[0];
          }
        }
      } catch {
        debug.itemFallbackError = "Failed to query any items";
      }
    }

    // ── 3. Query tax codes ──
    let taxCodes: any[] = [];
    try {
      const tcQuery = encodeURIComponent("SELECT * FROM TaxCode WHERE Active = true");
      const tcRes = await fetch(`${baseUrl}/${realmId}/query?query=${tcQuery}&minorversion=73`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (tcRes.ok) {
        const tcData = await tcRes.json();
        taxCodes = tcData.QueryResponse?.TaxCode ?? [];
        debug.taxCodes = taxCodes.map((tc: any) => ({
          id: tc.Id,
          name: tc.Name,
          taxable: tc.Taxable,
          configType: tc.TaxCodeConfigType,
          rates: tc.SalesTaxRateList?.TaxRateDetail?.map((r: any) => r.TaxRateRef) ?? [],
        }));
      }
    } catch {
      debug.taxCodeError = "Failed to query tax codes";
    }

    // ── 4. Query tax rates for detail ──
    try {
      const trQuery = encodeURIComponent("SELECT * FROM TaxRate WHERE Active = true");
      const trRes = await fetch(`${baseUrl}/${realmId}/query?query=${trQuery}&minorversion=73`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (trRes.ok) {
        const trData = await trRes.json();
        debug.taxRates = (trData.QueryResponse?.TaxRate ?? []).map((tr: any) => ({
          id: tr.Id,
          name: tr.Name,
          rateValue: tr.RateValue,
          agencyRef: tr.AgencyRef,
          description: tr.Description,
        }));
      }
    } catch {
      debug.taxRateError = "Failed to query tax rates";
    }

    // ── 5. Build the shipping address ──
    const shipAddr: Record<string, string> = {};
    if (line1) shipAddr.Line1 = line1;
    if (city) shipAddr.City = city;
    if (state) shipAddr.CountrySubDivisionCode = state;
    if (postalCode) shipAddr.PostalCode = postalCode;

    // ── 6. Build Estimate payload ──
    // Line-level TaxCodeRef MUST be "TAX" or "NON" (QBO validation rule).
    // For non-AST companies: set TxnTaxDetail.TxnTaxCodeRef at the transaction
    // level to the specific tax code ID — this tells QBO which rates to apply.
    const lineItem: Record<string, any> = {
      DetailType: "SalesItemLineDetail",
      Amount: subtotal,
      SalesItemLineDetail: {
        Qty: 1,
        UnitPrice: subtotal,
        TaxCodeRef: { value: "TAX" },
        ...(itemId ? { ItemRef: { value: itemId, name: itemName } } : {}),
      },
    };

    const estimatePayload: Record<string, any> = {
      CustomerRef: { value: customerId },
      ShipAddr: shipAddr,
      BillAddr: shipAddr,
      Line: [lineItem],
    };

    // For non-AST: set transaction-level tax code so QBO applies its rates
    if (!isAST && defaultTaxCodeId) {
      estimatePayload.TxnTaxDetail = {
        TxnTaxCodeRef: { value: defaultTaxCodeId },
      };
    }

    debug.estimatePayload = estimatePayload;

    const createRes = await fetch(`${baseUrl}/${realmId}/estimate?minorversion=73`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(estimatePayload),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error("Failed to create temp estimate:", JSON.stringify(err, null, 2));
      return NextResponse.json(
        { error: "Failed to create temporary estimate in QBO", details: err, debug },
        { status: createRes.status },
      );
    }

    const estimateData = await createRes.json();
    const estimate = estimateData.Estimate;
    debug.rawEstimate = estimate;

    // ── 7. Extract tax info ──
    const totalTax: number = estimate.TxnTaxDetail?.TotalTax ?? 0;
    const taxPercent = subtotal > 0 ? (totalTax / subtotal) * 100 : 0;

    const taxLines = (estimate.TxnTaxDetail?.TaxLine ?? []).map((tl: any) => ({
      amount: tl.Amount,
      netAmountTaxable: tl.TaxLineDetail?.NetAmountTaxable,
      taxPercent: tl.TaxLineDetail?.TaxPercent,
      taxRateRef: tl.TaxLineDetail?.TaxRateRef?.value,
    }));

    const estimateId = estimate.Id;
    const syncToken = estimate.SyncToken;

    // ── 8. Delete the temporary estimate ──
    let deleteResult = "unknown";
    try {
      const delRes = await fetch(
        `${baseUrl}/${realmId}/estimate?operation=delete&minorversion=73`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ Id: estimateId, SyncToken: syncToken }),
        },
      );
      deleteResult = delRes.ok ? "deleted" : `failed (${delRes.status})`;
    } catch (deleteErr) {
      deleteResult = `error: ${deleteErr}`;
      console.error("Failed to delete temp estimate:", deleteErr);
    }
    debug.deleteResult = deleteResult;

    return NextResponse.json({
      taxPercent: Math.round(taxPercent * 10000) / 10000,
      totalTax,
      subtotal,
      totalWithTax: subtotal + totalTax,
      taxLines,
      address: shipAddr,
      customerUsed: { id: customerId, name: customerName },
      taxMode: isAST ? "automated" : "manual",
      taxModeNote: isAST
        ? "AST enabled — tax rate calculated by address"
        : "Manual tax mode — rate comes from company's default tax code, NOT address-specific. Enable AST in QBO settings for address-based rates.",
      debug,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("tax-percent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate tax" },
      { status: 500 },
    );
  }
}
