import type { QuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";

// Human-readable labels for the variable tokens, used by the editor palette.
export const VARIABLE_LABELS: Record<string, string> = {
  "{{firstName}}": "First name",
  "{{customerName}}": "Customer name",
  "{{quoteLink}}": "View-quote link",
  "{{quoteNumber}}": "Quote number",
  "{{eventName}}": "Event name",
  "{{eventStartDate}}": "Event start date",
  "{{total}}": "Total",
  "{{accountManager}}": "Account manager",
  "{{companyName}}": "Sales office name",
  "{{amountPaid}}": "Amount paid",
  "{{amountDue}}": "Amount due",
  "{{dueDate}}": "Due date",
};

// Example values for the editor's live preview.
export const SAMPLE_VALUES: Record<string, string> = {
  firstName: "Jordan",
  customerName: "Jordan Ellis",
  quoteLink: "https://app.example.com/quotes/abc123",
  quoteNumber: "Q-10428",
  eventName: "Homecoming Game",
  eventStartDate: "October 12, 2026",
  total: "$4,250.00",
  accountManager: "Sam Rivera",
  companyName: "Bleacher Rentals — Dallas",
  amountPaid: "$2,125.00",
  amountDue: "$2,125.00",
  dueDate: "November 1, 2026",
};

/**
 * Replace every {{token}} in `template` using `values`. Unknown tokens are left
 * untouched; a mapped value of null/undefined renders as an empty string.
 */
export function renderTemplate(
  template: string,
  values: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in values ? (values[name] ?? "") : match,
  );
}

function centsToCurrency(cents: number | null | undefined, currency: string): string {
  if (cents == null) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Build the real substitution values for a booking. Optional payment context
 * fills the amountPaid/amountDue/dueDate tokens for payment triggers.
 */
export function buildVariableValues(
  docData: QuoteDocumentData,
  payment?: { amountPaidCents?: number; amountDueCents?: number; dueDate?: string },
): Record<string, string> {
  const currency = docData.currency ?? "USD";
  return {
    firstName: (docData.contact?.name ?? "").trim().split(/\s+/)[0] ?? "",
    customerName: docData.contact?.name ?? "",
    quoteLink: docData.publicUrl ?? "",
    quoteNumber: docData.quoteNumber ?? "",
    eventName: docData.venue?.name ?? "",
    eventStartDate: formatDate(docData.dates?.eventStart),
    total: centsToCurrency(docData.totalCents, currency),
    accountManager: docData.accountManager ?? "",
    companyName: docData.company?.name ?? "",
    amountPaid: centsToCurrency(payment?.amountPaidCents, currency),
    amountDue: centsToCurrency(payment?.amountDueCents, currency),
    dueDate: formatDate(payment?.dueDate),
  };
}

/** Recipient email for a trigger's recipient type. */
export function recipientEmail(
  docData: QuoteDocumentData,
  recipient: "client" | "account_manager",
): string | null {
  const email =
    recipient === "client" ? docData.contact?.email : docData.accountManagerEmail;
  return email?.trim() || null;
}
