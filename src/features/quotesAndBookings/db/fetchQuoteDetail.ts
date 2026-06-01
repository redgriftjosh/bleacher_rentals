import { db, powerSyncDb } from "@/components/providers/SystemProvider";

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

type Row = {
  id: string;
  event_name: string;
  event_status: string | null;
  event_start: string | null;
  event_end: string | null;
  setup_start: string | null;
  teardown_end: string | null;
  notes: string | null;
  internal_notes: string | null;
  external_notes: string | null;
  contract_revenue_cents: number | null;
  booked_at: string | null;
  created_at: string;
  address_street: string | null;
  address_city: string | null;
  address_state_province: string | null;
  address_zip_postal: string | null;
  contact_id: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  am_first_name: string | null;
  am_last_name: string | null;
};

export async function fetchQuoteDetail(eventId: string): Promise<QuoteDetail | null> {
  const compiled = db
    .selectFrom("Events as e")
    .leftJoin("Addresses as a", "e.address_uuid", "a.id")
    .leftJoin("Contacts as ct", "e.contact_uuid", "ct.id")
    .leftJoin("Users as u", "e.created_by_user_uuid", "u.id")
    .select([
      "e.id as id",
      "e.event_name as event_name",
      "e.event_status as event_status",
      "e.event_start as event_start",
      "e.event_end as event_end",
      "e.setup_start as setup_start",
      "e.teardown_end as teardown_end",
      "e.notes as notes",
      "e.internal_notes as internal_notes",
      "e.external_notes as external_notes",
      "e.contract_revenue_cents as contract_revenue_cents",
      "e.booked_at as booked_at",
      "e.created_at as created_at",
      "a.street as address_street",
      "a.city as address_city",
      "a.state_province as address_state_province",
      "a.zip_postal as address_zip_postal",
      "ct.id as contact_id",
      "ct.first_name as contact_first_name",
      "ct.last_name as contact_last_name",
      "ct.email as contact_email",
      "ct.phone as contact_phone",
      "u.first_name as am_first_name",
      "u.last_name as am_last_name",
    ])
    .where("e.id", "=", eventId)
    .compile();

  const rows = await powerSyncDb.getAll<Row>(compiled.sql, compiled.parameters as any[]);

  if (rows.length === 0) return null;

  const r = rows[0];

  return {
    id: r.id,
    eventName: r.event_name,
    eventStatus: r.event_status,
    eventStart: r.event_start,
    eventEnd: r.event_end,
    setupStart: r.setup_start,
    teardownEnd: r.teardown_end,
    notes: r.notes,
    internalNotes: r.internal_notes,
    externalNotes: r.external_notes,
    contractRevenueCents: r.contract_revenue_cents,
    bookedAt: r.booked_at,
    createdAt: r.created_at,
    address: r.address_street
      ? {
          street: r.address_street,
          city: r.address_city ?? "",
          stateProvince: r.address_state_province ?? "",
          zipPostal: r.address_zip_postal,
        }
      : null,
    contact: r.contact_id
      ? {
          id: r.contact_id,
          firstName: r.contact_first_name ?? "",
          lastName: r.contact_last_name,
          email: r.contact_email,
          phone: r.contact_phone,
        }
      : null,
    accountManager:
      r.am_first_name || r.am_last_name
        ? { firstName: r.am_first_name, lastName: r.am_last_name }
        : null,
  };
}
