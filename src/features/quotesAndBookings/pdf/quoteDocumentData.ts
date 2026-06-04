import { createClient } from "@supabase/supabase-js";

// ── The single source of truth for rendering a quote ──

export type QuoteLineItem = {
  label: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
};

export type QuotePaymentInstallment = {
  dueDate: string;
  amountCents: number;
  status: string;
};

export type QuoteDocumentData = {
  // Header
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  status: string;
  currency: "USD" | "CAD";

  // Company (the business sending the quote)
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };

  // Client contact
  contact: {
    name: string;
    email: string;
    phone: string;
  } | null;

  // Venue / event address
  venue: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Dates
  dates: {
    eventStart: string;
    eventEnd: string;
  };

  // Line items
  lineItems: QuoteLineItem[];

  // Totals (all in cents)
  subtotalCents: number;
  discountsCents: number;
  taxPercent: number;
  taxAmountCents: number;
  totalCents: number;

  // Payment schedule
  paymentSchedule: QuotePaymentInstallment[];

  // Notes
  clientNotes: string;
  internalNotes: string;

  // Public link
  publicUrl: string;

  // Account manager
  accountManager: string;
};

// ── Helper ──

function formatCents(cents: number): number {
  return cents;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Builder: fetches everything from DB and returns one object ──

export async function buildQuoteDocumentData(
  eventId: string,
  origin?: string,
): Promise<QuoteDocumentData | null> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch event with joins
  const { data: event, error } = await supabase
    .from("Events")
    .select(
      `
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
      quote_valid_till,
      created_at,
      created_by_user_uuid,
      Addresses!Events_address_uuid_fkey (
        street, city, state_province, zip_postal
      ),
      Contacts!Events_contact_uuid_fkey (
        first_name, last_name, email, phone
      ),
      Users!Events_created_by_user_uuid_fkey (
        first_name, last_name, email
      )
    `,
    )
    .eq("id", eventId)
    .single();

  if (error || !event) {
    console.error("buildQuoteDocumentData: failed to fetch event", error);
    return null;
  }

  const addr = event.Addresses as any;
  const contact = event.Contacts as any;
  const user = event.Users as any;

  // 2. Fetch line items
  const { data: lineItemRows } = await supabase
    .from("EventLineItems")
    .select("header, description, quantity, value_cents, currency")
    .eq("event_uuid", eventId)
    .eq("deleted", false)
    .order("created_at");

  const lineItems: QuoteLineItem[] = (lineItemRows ?? []).map((li: any) => ({
    label: li.header,
    description: li.description ?? "",
    qty: li.quantity ?? 1,
    unitPrice: li.value_cents,
    total: (li.quantity ?? 1) * li.value_cents,
  }));

  // 3. Fetch payment installments
  const { data: installmentRows } = await supabase
    .from("PaymentInstallments")
    .select("due_date, amount_cents, status")
    .eq("event_uuid", eventId)
    .order("due_date");

  const paymentSchedule: QuotePaymentInstallment[] = (installmentRows ?? []).map((pi: any) => ({
    dueDate: pi.due_date,
    amountCents: pi.amount_cents,
    status: pi.status,
  }));

  // 4. Calculate totals (discount line items have negative value_cents)
  const subtotalCents = lineItems
    .filter((li) => li.total >= 0)
    .reduce((sum, li) => sum + li.total, 0);
  const discountsCents = lineItems
    .filter((li) => li.total < 0)
    .reduce((sum, li) => sum + li.total, 0);
  const taxableAmount = subtotalCents + discountsCents;
  const taxPercent = 0; // TODO: fetch from QBO or store
  const taxAmountCents = Math.round(taxableAmount * (taxPercent / 100));
  const totalCents = taxableAmount + taxAmountCents;

  // 5. Determine currency from first line item or default
  const currency = (lineItemRows?.[0]?.currency as "USD" | "CAD") ?? "USD";

  // 6. Build public URL
  const appOrigin = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.bleacherrentals.com";
  const publicUrl = `${appOrigin}/quote/${eventId}`;

  return {
    quoteNumber: `${eventId}`,
    quoteDate: event.created_at?.split("T")[0] ?? "",
    validUntil: (event as any).quote_valid_till ?? "",
    status: event.event_status ?? "draft",
    currency,

    company: {
      name: "Bleacher Rentals",
      address: "", // TODO: from SalesOffice address
      phone: "",
      email: "",
    },

    contact: contact
      ? {
          name: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(),
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        }
      : null,

    venue: {
      name: event.event_name,
      street: addr?.street ?? "",
      city: addr?.city ?? "",
      state: addr?.state_province ?? "",
      zip: addr?.zip_postal ?? "",
    },

    dates: {
      eventStart: event.event_start ?? "",
      eventEnd: event.event_end ?? "",
    },

    lineItems,

    subtotalCents,
    discountsCents,
    taxPercent,
    taxAmountCents,
    totalCents,

    paymentSchedule,

    clientNotes: event.external_notes ?? event.notes ?? "",
    internalNotes: event.internal_notes ?? "",

    publicUrl,

    accountManager: user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : "",
  };
}
