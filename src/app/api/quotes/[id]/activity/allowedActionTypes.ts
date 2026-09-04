export const ALLOWED_ACTION_TYPES = new Set([
  "client_page_view",
  "client_tab_change",
  "client_contract_signed",
  "client_po_submitted",
  "client_payment_started",
  "client_pdf_download",
  // Client corrected the language the account manager set on their contact.
  "client_language_change",
]);
