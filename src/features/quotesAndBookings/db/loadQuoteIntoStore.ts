import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { useCreateQuoteStore } from "../state/useCreateQuoteStore";
import { fetchPaymentInstallments } from "./paymentInstallments";

/**
 * Fetches an event by ID and loads its data into useCreateQuoteStore for editing.
 * Returns the event ID on success, null on failure.
 */
export async function loadQuoteIntoStore(
  eventId: string,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("Events")
    .select(`
      id,
      event_name,
      event_status,
      event_start,
      event_end,
      setup_start,
      teardown_end,
      notes,
      internal_notes,
      external_notes,
      contract_revenue_cents,
      created_by_user_uuid,
      address_uuid,
      contact_uuid,
      Addresses!Events_address_uuid_fkey (
        street,
        city,
        state_province,
        zip_postal
      ),
      Contacts!Events_contact_uuid_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        company_uuid
      )
    `)
    .eq("id", eventId)
    .single();

  if (error || !data) {
    console.error("Failed to load quote for editing:", error);
    return null;
  }

  const store = useCreateQuoteStore.getState();
  const addr = data.Addresses as {
    street: string; city: string; state_province: string; zip_postal: string | null;
  } | null;
  const contact = data.Contacts as {
    id: string; first_name: string; last_name: string | null;
    email: string | null; phone: string | null; company_uuid: string | null;
  } | null;

  store.setField("eventName", data.event_name ?? "");
  store.setField("eventStart", data.event_start ?? "");
  store.setField("eventEnd", data.event_end ?? "");
  store.setField("dropArrivalDate", data.setup_start ?? "");
  store.setField("pickUpDate", data.teardown_end ?? "");
  store.setField("clientFacingNotes", data.external_notes ?? data.notes ?? "");
  store.setField("internalNotes", data.internal_notes ?? "");
  store.setField("ownerUserUuid", data.created_by_user_uuid ?? null);

  if (addr) {
    store.setField("eventAddress", addr.street);
    store.setField("eventAddressData", {
      street: addr.street,
      city: addr.city,
      stateProvince: addr.state_province,
      zipPostal: addr.zip_postal ?? "",
    });
  }

  if (contact) {
    store.setField("contactId", contact.id);
    store.setField("contactName", `${contact.first_name} ${contact.last_name ?? ""}`.trim());
    if (contact.email) store.setField("companyEmail", contact.email);
    if (contact.phone) store.setField("phone", contact.phone);
  }

  // Load payment installments from PowerSync
  try {
    const installments = await fetchPaymentInstallments(data.id);
    store.setField("paymentInstallments", installments);
  } catch (e) {
    console.error("Failed to load payment installments:", e);
  }

  return data.id;
}
