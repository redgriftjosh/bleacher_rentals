import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";
import { syncPaymentInstallments } from "./paymentInstallments";

/**
 * Creates a full quote:
 * 1. Insert event address
 * 2. Insert Event row
 * 3. Sync payment installments
 */
export async function createQuoteEvent(
  state: CreateQuoteState,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  // 1. Insert Address
  let addressUuid: string | null = null;

  if (state.eventAddressData) {
    const { data: addressData, error: addressError } = await supabase
      .from("Addresses")
      .insert({
        street: state.eventAddressData.street,
        city: state.eventAddressData.city,
        state_province: state.eventAddressData.stateProvince,
        zip_postal: state.eventAddressData.zipPostal || null,
      })
      .select("id")
      .single();

    if (addressError || !addressData) {
      createErrorToast(["Failed to insert event address.", addressError?.message ?? ""]);
    }

    addressUuid = addressData!.id;
  }

  // 2. Insert Event
  const newEvent: TablesInsert<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart || null!,
    event_end: state.eventEnd || null!,
    address_uuid: addressUuid,
    event_status: state.status || "draft",
    event_type_uuid: state.eventTypeId || null,
    lenient: false,
    must_be_clean: false,
    notes: state.clientFacingNotes || null,
    internal_notes: state.internalNotes || null,
    external_notes: state.clientFacingNotes || null,
    created_by_user_uuid: state.ownerUserUuid ?? null,
    contact_uuid: state.contactId || null,
  };

  const { data: eventData, error: eventError } = await supabase
    .from("Events")
    .insert(newEvent)
    .select("id")
    .single();

  if (eventError || !eventData) {
    if (addressUuid) {
      await supabase.from("Addresses").delete().eq("id", addressUuid);
    }
    createErrorToast(["Failed to create quote.", eventError?.message ?? ""]);
  }

  const eventUuid = eventData!.id;

  // 3. Insert line items
  if (state.lineItems.length > 0) {
    const lineItemRows = state.lineItems.map((li) => ({
      event_uuid: eventUuid,
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
      console.error("Line items insert failed (quote still saved):", lineItemError.message);
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

  return eventUuid;
}
