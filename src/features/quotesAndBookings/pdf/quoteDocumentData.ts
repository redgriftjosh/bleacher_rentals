import { createClient } from "@supabase/supabase-js";
import { resolveInvoiceDisplay, buildPublicQuoteUrl, parseInvoiceParam } from "../utils/invoiceNumber";

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
  // Internal ID (for API routes)
  eventId: string;
  // Header
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  status: string;
  currency: "USD" | "CAD";

  // Company (the business sending the quote — from SalesOffice)
  company: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    website: string;
  };

  // Client contact
  contact: {
    name: string;
    email: string;
    phone: string;
  } | null;

  // Purchase Order number (from client, set after payment)
  poNumber: string | null;

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

  // Terms & Conditions
  termsAndConditionsUuid: string | null;
  termsHtml: string | null;

  // Contract signature
  contractSignature: {
    signerName: string;
    signedAt: string;
  } | null;
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
      invoice_number,
      po_number,
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
      sales_office_uuid,
      terms_and_conditions_uuid,
      tax_percent,
      tax_amount_cents,
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

  // Parallel fetch: salesOffice, lineItems, installments, terms, signature
  const [soResult, lineItemResult, installmentResult, termsResult, sigResult] =
    await Promise.all([
      // SalesOffice
      event.sales_office_uuid
        ? supabase
            .from("SalesOffices")
            .select(`
              name,
              phone,
              Addresses!SalesOffices_address_uuid_fkey (
                street, city, state_province, zip_postal
              )
            `)
            .eq("id", event.sales_office_uuid)
            .single()
        : Promise.resolve({ data: null }),

      // Line items
      supabase
        .from("EventLineItems")
        .select("header, description, quantity, value_cents, currency")
        .eq("event_uuid", eventId)
        .eq("deleted", false)
        .order("created_at"),

      // Payment installments
      supabase
        .from("PaymentInstallments")
        .select("due_date, amount_cents, status")
        .eq("event_uuid", eventId)
        .order("due_date"),

      // Terms & Conditions
      (event as any).terms_and_conditions_uuid
        ? supabase
            .from("TermsAndConditions")
            .select("html_content")
            .eq("id", (event as any).terms_and_conditions_uuid)
            .single()
        : Promise.resolve({ data: null }),

      // Contract signature
      (event as any).terms_and_conditions_uuid
        ? supabase
            .from("ContractSignatures")
            .select("signer_name, signed_at")
            .eq("event_uuid", eventId)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // Process SalesOffice
  let salesOffice: { name: string; phone: string | null; street: string; city: string; state: string; zip: string } | null = null;
  if (soResult.data) {
    const so = soResult.data as any;
    const soAddr = so.Addresses;
    salesOffice = {
      name: so.name,
      phone: so.phone ?? null,
      street: soAddr?.street ?? "",
      city: soAddr?.city ?? "",
      state: soAddr?.state_province ?? "",
      zip: soAddr?.zip_postal ?? "",
    };
  }

  // Process line items
  const lineItemRows = lineItemResult.data;
  const lineItems: QuoteLineItem[] = (lineItemRows ?? []).map((li: any) => ({
    label: li.header,
    description: li.description ?? "",
    qty: li.quantity ?? 1,
    unitPrice: li.value_cents,
    total: (li.quantity ?? 1) * li.value_cents,
  }));

  // Process installments
  const paymentSchedule: QuotePaymentInstallment[] = (installmentResult.data ?? []).map((pi: any) => ({
    dueDate: pi.due_date,
    amountCents: pi.amount_cents,
    status: pi.status,
  }));

  // Calculate totals
  const subtotalCents = lineItems
    .filter((li) => li.total >= 0)
    .reduce((sum, li) => sum + li.total, 0);
  const discountsCents = lineItems
    .filter((li) => li.total < 0)
    .reduce((sum, li) => sum + li.total, 0);
  const taxableAmount = subtotalCents + discountsCents;
  const taxPercent = (event as any).tax_percent ?? 0;
  const taxAmountCents = (event as any).tax_amount_cents ?? Math.round(taxableAmount * (taxPercent / 100));
  const totalCents = taxableAmount + taxAmountCents;

  const currency = (lineItemRows?.[0]?.currency as "USD" | "CAD") ?? "USD";

  const appOrigin = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.bleacherrentals.com";
  const invoiceNum = resolveInvoiceDisplay(event.invoice_number, eventId);
  const publicUrl = buildPublicQuoteUrl(appOrigin, event.invoice_number, eventId);

  // Process terms & signature
  const sig = sigResult.data as any;

  return {
    eventId,
    quoteNumber: invoiceNum,
    quoteDate: event.created_at?.split("T")[0] ?? "",
    validUntil: (event as any).quote_valid_till ?? "",
    status: event.event_status ?? "draft",
    currency,

    company: {
      name: salesOffice?.name ?? "Bleacher Rentals",
      street: salesOffice?.street ?? "",
      city: salesOffice?.city ?? "",
      state: salesOffice?.state ?? "",
      zip: salesOffice?.zip ?? "",
      phone: salesOffice?.phone ?? "",
      email: "office@bleacherrentals.com",
      website: "www.BleacherRentals.com",
    },

    contact: contact
      ? {
          name: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(),
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        }
      : null,

    poNumber: (event as any).po_number ?? null,

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

    termsAndConditionsUuid: (event as any).terms_and_conditions_uuid ?? null,
    termsHtml: (termsResult.data as any)?.html_content ?? null,
    contractSignature: sig
      ? { signerName: sig.signer_name, signedAt: sig.signed_at }
      : null,
  } satisfies QuoteDocumentData;
}

/**
 * Lookup by invoice_number (for public /quote/[invoiceNumber] route).
 * Falls back to UUID lookup for backward compatibility with old links.
 */
export async function buildQuoteDocumentDataByInvoice(
  invoiceNumberOrId: string,
  origin?: string,
): Promise<QuoteDocumentData | null> {
  const supabase = getSupabaseAdmin();

  const parsed = parseInvoiceParam(invoiceNumberOrId);

  if (parsed.type === "invoice_number") {
    const { data } = await supabase
      .from("Events")
      .select("id")
      .eq("invoice_number", parsed.value as number)
      .single();

    if (data) return buildQuoteDocumentData(data.id, origin);
  }

  // Fallback: treat as UUID (backward compat for old bookmarked links)
  return buildQuoteDocumentData(invoiceNumberOrId, origin);
}
