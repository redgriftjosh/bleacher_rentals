import { useCreateQuoteStore } from "../state/useCreateQuoteStore";
import { fetchPaymentInstallments } from "./paymentInstallments";
import { fetchQuoteDetail } from "./fetchQuoteDetail";
import { resolveInvoiceDisplay } from "../utils/invoiceNumber";

/**
 * Fetches an event by ID (via PowerSync) and loads its data into useCreateQuoteStore for editing.
 * Returns the event ID on success, null on failure.
 */
export async function loadQuoteIntoStore(eventId: string): Promise<string | null> {
  const data = await fetchQuoteDetail(eventId);

  if (!data) {
    console.error("Failed to load quote for editing");
    return null;
  }

  const store = useCreateQuoteStore.getState();

  store.setField("quoteNumber", resolveInvoiceDisplay(data.invoiceNumber, data.id));
  store.setField("eventName", data.eventName ?? "");
  store.setField("eventStart", data.eventStart ?? "");
  store.setField("eventEnd", data.eventEnd ?? "");
  store.setField("eventTypeId", data.eventTypeUuid ?? null);
  store.setField("quoteValidTill", data.quoteValidTill ?? "");
  store.setField("clientFacingNotes", data.externalNotes ?? data.notes ?? "");
  store.setField("internalNotes", data.internalNotes ?? "");

  if (data.address) {
    store.setField("eventAddress", data.address.street);
    store.setField("eventAddressData", {
      street: data.address.street,
      city: data.address.city,
      stateProvince: data.address.stateProvince,
      zipPostal: data.address.zipPostal ?? "",
    });
  }

  if (data.contact) {
    store.setField("contactId", data.contact.id);
    store.setField(
      "contactName",
      `${data.contact.firstName} ${data.contact.lastName ?? ""}`.trim(),
    );
    if (data.contact.email) store.setField("companyEmail", data.contact.email);
    if (data.contact.phone) store.setField("phone", data.contact.phone);
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
