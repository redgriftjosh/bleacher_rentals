import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";
import { syncPaymentInstallments } from "./paymentInstallments";
import { calculateTotals } from "../utils/calculateTotals";
import { logSingleChange } from "./logEventChanges";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

export async function createQuoteEvent(
  state: CreateQuoteState,
  supabase: SupabaseClient<Database>,
  currentUserUuid?: string | null,
): Promise<string> {
  // 1. Insert Address
  let addressUuid: string | null = null;

  if (state.eventAddressData) {
    addressUuid = crypto.randomUUID();
    await typedExecute(
      db
        .insertInto("Addresses")
        .values({
          id: addressUuid,
          street: state.eventAddressData.street ?? "",
          city: state.eventAddressData.city ?? "",
          state_province: state.eventAddressData.stateProvince ?? "",
          zip_postal: state.eventAddressData.zipPostal || null,
        })
        .compile(),
    );
  }

  // 2. Insert Event
  const { taxAmount } = calculateTotals(state.lineItems, state.taxPercent);
  const effectiveTaxCents = state.taxOverrideCents ?? Math.round(taxAmount);
  const contractRevenueCents =
    state.lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0) + effectiveTaxCents;

  const eventUuid = crypto.randomUUID();

  await typedExecute(
    db
      .insertInto("Events")
      .values({
        id: eventUuid,
        event_name: state.eventName,
        event_start: state.eventStart || null,
        event_end: state.eventEnd || null,
        address_uuid: addressUuid,
        event_status: state.status || "draft",
        event_type_uuid: state.eventTypeId || null,
        quote_valid_till: state.quoteValidTill || null,
        contract_revenue_cents: contractRevenueCents,
        tax_percent: state.taxPercent,
        tax_amount_cents: effectiveTaxCents,
        lenient: 0,
        must_be_clean: 0,
        deleted: 0,
        notes: state.clientFacingNotes || null,
        internal_notes: state.internalNotes || null,
        external_notes: state.clientFacingNotes || null,
        created_by_user_uuid: state.ownerUserUuid ?? currentUserUuid ?? null,
        contact_uuid: state.contactId || null,
        finance_contact_uuid: state.financeContactId || null,
        sales_office_uuid: state.salesOfficeId || null,
        terms_and_conditions_uuid: state.termsDocumentId || null,
      } as any)
      .compile(),
  );

  // Generate unique 9-digit invoice number (must use Supabase RPC)
  const { data: invoiceData } = await (supabase.rpc as any)("generate_invoice_number");

  if (invoiceData != null) {
    await typedExecute(
      db
        .updateTable("Events")
        .set({ invoice_number: Number(invoiceData) } as any)
        .where("id", "=", eventUuid)
        .compile(),
    );
  }

  // 3. Insert line items
  if (state.lineItems.length > 0) {
    for (const li of state.lineItems) {
      await typedExecute(
        db
          .insertInto("EventLineItems")
          .values({
            id: crypto.randomUUID(),
            event_uuid: eventUuid,
            header: li.label,
            description: null,
            bleacher_type_uuid: li.bleacherTypeUuid || null,
            value_cents: li.category === "discounts" ? li.lineTotalCents : li.unitPriceCents,
            quantity: li.qty,
            currency: state.currency,
            is_template: 0,
            deleted: 0,
          } as any)
          .compile(),
      );
    }
  }

  // 4. Sync payment installments
  if (state.paymentInstallments.length > 0) {
    try {
      await syncPaymentInstallments(eventUuid, state.paymentInstallments, state.currency);
    } catch (e) {
      console.error("Payment installments sync failed (quote still saved):", e);
    }
  }

  // 5. Log creation
  await logSingleChange(
    supabase,
    eventUuid,
    currentUserUuid ?? null,
    "event_name",
    null,
    state.eventName,
    "create",
  );

  return eventUuid;
}
