import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type QuoteDetail = {
  id: string;
  eventName: string;
  eventStatus: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  setupStart: string | null;
  teardownEnd: string | null;
  notes: string | null;
  internalNotes: string | null;
  externalNotes: string | null;
  contractRevenueCents: number | null;
  bookedAt: string | null;
  createdAt: string;
  address: {
    street: string;
    city: string;
    stateProvince: string;
    zipPostal: string | null;
  } | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  accountManager: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export async function fetchQuoteDetail(
  eventId: string,
  supabase: SupabaseClient<Database>,
): Promise<QuoteDetail | null> {
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
      booked_at,
      created_at,
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
        phone
      ),
      Users!Events_created_by_user_uuid_fkey (
        first_name,
        last_name
      )
    `)
    .eq("id", eventId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch quote detail:", error);
    return null;
  }

  const addr = data.Addresses as { street: string; city: string; state_province: string; zip_postal: string | null } | null;
  const contact = data.Contacts as { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null } | null;
  const user = data.Users as { first_name: string | null; last_name: string | null } | null;

  return {
    id: data.id,
    eventName: data.event_name,
    eventStatus: data.event_status,
    eventStart: data.event_start,
    eventEnd: data.event_end,
    setupStart: data.setup_start,
    teardownEnd: data.teardown_end,
    notes: data.notes,
    internalNotes: data.internal_notes,
    externalNotes: data.external_notes,
    contractRevenueCents: data.contract_revenue_cents,
    bookedAt: data.booked_at,
    createdAt: data.created_at,
    address: addr
      ? { street: addr.street, city: addr.city, stateProvince: addr.state_province, zipPostal: addr.zip_postal }
      : null,
    contact: contact
      ? { id: contact.id, firstName: contact.first_name, lastName: contact.last_name, email: contact.email, phone: contact.phone }
      : null,
    accountManager: user
      ? { firstName: user.first_name, lastName: user.last_name }
      : null,
  };
}
