import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesUpdate } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";

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
  const updates: TablesUpdate<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart || undefined,
    event_end: state.eventEnd || undefined,
    setup_start: state.dropArrivalDate || null,
    teardown_end: state.pickUpDate || null,
    notes: state.clientFacingNotes || null,
    internal_notes: state.internalNotes || null,
    external_notes: state.clientFacingNotes || null,
    created_by_user_uuid: state.ownerUserUuid ?? undefined,
    contact_uuid: state.contactId || null,
  };

  if (addressUuid) {
    updates.address_uuid = addressUuid;
  }

  const { error } = await supabase
    .from("Events")
    .update(updates)
    .eq("id", eventId);

  if (error) {
    createErrorToast(["Failed to update quote.", error.message ?? ""]);
  }
}
