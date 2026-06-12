import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesUpdate } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";
import { syncPaymentInstallments } from "./paymentInstallments";
import { calculateTotals } from "../utils/calculateTotals";

/**
 * Updates an existing quote/event.
 * 1. Upsert address if changed
 * 2. Update Event row
 */
export async function updateQuoteEvent(
  eventId: string,
  state: CreateQuoteState,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  // 1. Handle address
  let addressUuid: string | null = null;

  if (state.eventAddressData) {
    // Check if event already has an address
    const { data: existing } = await supabase
      .from("Events")
      .select("address_uuid")
      .eq("id", eventId)
      .single();

    if (existing?.address_uuid) {
      // Update existing address
      await supabase
        .from("Addresses")
        .update({
          street: state.eventAddressData.street,
          city: state.eventAddressData.city,
          state_province: state.eventAddressData.stateProvince,
          zip_postal: state.eventAddressData.zipPostal || null,
        })
        .eq("id", existing.address_uuid);

      addressUuid = existing.address_uuid;
    } else {
      // Insert new address
      const { data: addrData, error: addrError } = await supabase
        .from("Addresses")
        .insert({
          street: state.eventAddressData.street,
          city: state.eventAddressData.city,
          state_province: state.eventAddressData.stateProvince,
          zip_postal: state.eventAddressData.zipPostal || null,
        })
        .select("id")
        .single();

      if (addrError || !addrData) {
        createErrorToast(["Failed to insert event address.", addrError?.message ?? ""]);
      }
      addressUuid = addrData!.id;
    }
  }

  // 2. Update Event
  const { taxAmount } = calculateTotals(state.lineItems, state.taxPercent);
  const effectiveTaxCents = state.taxOverrideCents ?? Math.round(taxAmount);
  const contractRevenueCents = state.lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0) + effectiveTaxCents;

  const updates: TablesUpdate<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart || undefined,
    event_end: state.eventEnd || undefined,
    event_status: state.status || "draft",
    event_type_uuid: state.eventTypeId || null,
    quote_valid_till: state.quoteValidTill || null,
    contract_revenue_cents: contractRevenueCents,
    tax_percent: state.taxPercent,
    tax_amount_cents: effectiveTaxCents,
    notes: state.clientFacingNotes || null,
    internal_notes: state.internalNotes || null,
    external_notes: state.clientFacingNotes || null,
    created_by_user_uuid: state.ownerUserUuid ?? undefined,
    contact_uuid: state.contactId || null,
    sales_office_uuid: state.salesOfficeId || null,
    terms_and_conditions_uuid: state.termsDocumentId || null,
  };

  if (addressUuid) {
    updates.address_uuid = addressUuid;
  }

  const { error } = await supabase.from("Events").update(updates).eq("id", eventId);

  if (error) {
    createErrorToast(["Failed to update quote.", error.message ?? ""]);
  }

  // 3. Sync line items (delete old, insert new)
  if (state.lineItems.length > 0) {
    await supabase.from("EventLineItems").delete().eq("event_uuid", eventId);

    const lineItemRows = state.lineItems.map((li) => ({
      event_uuid: eventId,
      header: li.label,
      description: null as string | null,
      bleacher_type_uuid: li.bleacherTypeUuid || null,
      value_cents: li.category === "discounts" ? li.lineTotalCents : li.unitPriceCents,
      quantity: li.qty,
      currency: state.currency,
      is_template: false,
    }));

    const { error: lineItemError } = await supabase.from("EventLineItems").insert(lineItemRows);
    if (lineItemError) {
      console.error("Line items sync failed (quote still saved):", lineItemError.message);
    }
  }

  // 4. Sync payment installments
  try {
    await syncPaymentInstallments(eventId, state.paymentInstallments, state.currency);
  } catch (e) {
    console.error("Payment installments sync failed (quote still saved):", e);
  }
}
