import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";
import { createQuoteWorkTrackers } from "./createWorkTrackers";
import { syncPaymentInstallments } from "./paymentInstallments";

/**
 * Creates a full quote:
 * 1. Insert event address
 * 2. Insert Event row
 * 3. Create WorkTrackers for drop-off and pick-up dates
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
  // NOTE: sales_office_uuid will be added once database.types.ts is regenerated
  const newEvent: TablesInsert<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart || null!,
    event_end: state.eventEnd || null!,
    setup_start: state.dropArrivalDate || null,
    teardown_end: state.pickUpDate || null,
    address_uuid: addressUuid,
    event_status: "quoted",
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
    // Rollback address if event failed
    if (addressUuid) {
      await supabase.from("Addresses").delete().eq("id", addressUuid);
    }
    createErrorToast(["Failed to create quote.", eventError?.message ?? ""]);
  }

  const eventUuid = eventData!.id;

  // 3. Create WorkTrackers for drop-off and pick-up
  if (addressUuid && (state.dropArrivalDate || state.pickUpDate)) {
    try {
      await createQuoteWorkTrackers(
        {
          dropArrivalDate: state.dropArrivalDate,
          pickUpDate: state.pickUpDate,
          addressUuid,
        },
        supabase,
      );
    } catch (e) {
      // WorkTracker creation is non-critical — quote still saved
      console.error("WorkTracker creation failed (quote still saved):", e);
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
