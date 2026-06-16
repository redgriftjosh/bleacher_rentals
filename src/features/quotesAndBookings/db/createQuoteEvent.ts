import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";
import { syncPaymentInstallments } from "./paymentInstallments";
import { calculateTotals } from "../utils/calculateTotals";
import { logSingleChange } from "./logEventChanges";
import { eventRequirements } from "@/features/alerts/definitions/eventRequirements";
import { CurrentEventState } from "@/features/eventConfiguration/state/useCurrentEventStore";

/**
 * Creates a full quote:
 * 1. Insert event address
 * 2. Insert Event row
 * 3. Sync payment installments
 */
export async function createQuoteEvent(
  state: CreateQuoteState,
  supabase: SupabaseClient<Database>,
  currentUserUuid?: string | null,
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
  const { taxAmount } = calculateTotals(state.lineItems, state.taxPercent);
  const effectiveTaxCents = state.taxOverrideCents ?? Math.round(taxAmount);
  const contractRevenueCents = state.lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0) + effectiveTaxCents;

  const newEvent: TablesInsert<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart || null!,
    event_end: state.eventEnd || null!,
    address_uuid: addressUuid,
    event_status: state.status || "draft",
    event_type_uuid: state.eventTypeId || null,
    quote_valid_till: state.quoteValidTill || null,
    contract_revenue_cents: contractRevenueCents,
    tax_percent: state.taxPercent,
    tax_amount_cents: effectiveTaxCents,
    lenient: false,
    must_be_clean: false,
    notes: state.clientFacingNotes || null,
    internal_notes: state.internalNotes || null,
    external_notes: state.clientFacingNotes || null,
    created_by_user_uuid: state.ownerUserUuid ?? null,
    contact_uuid: state.contactId || null,
    finance_contact_uuid: state.financeContactId || null,
    sales_office_uuid: state.salesOfficeId || null,
    terms_and_conditions_uuid: state.termsDocumentId || null,
  };

  const { data: eventData, error: eventError } = await supabase
    .from("Events")
    .insert(newEvent)
    .select("id")
    .single();

  if (eventError || !eventData) {
    if (addressUuid) {
      await supabase.from("Addresses").delete().eq("id", addressUuid);
    }
    createErrorToast(["Failed to create quote.", eventError?.message ?? ""]);
  }

  const eventUuid = eventData!.id;

  // Generate unique 9-digit invoice number
  const { data: invoiceData } = await (supabase.rpc as any)("generate_invoice_number");

  if (invoiceData != null) {
    await supabase
      .from("Events")
      .update({ invoice_number: Number(invoiceData) })
      .eq("id", eventUuid);
  }

  // 3. Insert line items
  if (state.lineItems.length > 0) {
    const lineItemRows = state.lineItems.map((li) => ({
      event_uuid: eventUuid,
      header: li.label,
      description: null as string | null,
      bleacher_type_uuid: li.bleacherTypeUuid || null,
      value_cents: li.category === "discounts" ? li.lineTotalCents : li.unitPriceCents,
      quantity: li.qty,
      currency: state.currency,
      is_template: false,
    }));

    const { error: lineItemError } = await supabase.from("EventLineItems").insert(lineItemRows);

    if (lineItemError) {
      console.error("Line items insert failed (quote still saved):", lineItemError.message);
    }
  }

  // 4. Sync bleacher requirements from line items
  const reqMap = new Map<string, number>();
  for (const li of state.lineItems) {
    if (li.category === "bleachers" && li.bleacherTypeUuid) {
      reqMap.set(li.bleacherTypeUuid, (reqMap.get(li.bleacherTypeUuid) ?? 0) + li.qty);
    }
  }
  if (reqMap.size > 0) {
    const reqRows = [...reqMap.entries()].map(([btUuid, qty]) => ({
      event_uuid: eventUuid,
      bleacher_type_uuid: btUuid,
      quantity: qty,
    }));
    const { error: reqError } = await supabase.from("EventBleacherRequirements").insert(reqRows);
    if (reqError) {
      console.error("Bleacher requirements insert failed (quote still saved):", reqError.message);
    }
  }

  // 5. Sync payment installments
  if (state.paymentInstallments.length > 0) {
    try {
      await syncPaymentInstallments(eventUuid, state.paymentInstallments, state.currency);
    } catch (e) {
      console.error("Payment installments sync failed (quote still saved):", e);
    }
  }

  // 6. Sync "requirements not met" alert (no bleachers assigned yet)
  const requirements = [...reqMap.entries()].map(([btUuid, qty]) => ({
    bleacherTypeUuid: btUuid,
    quantity: qty,
  }));
  if (requirements.length > 0) {
    const pseudoEvent: Partial<CurrentEventState> = {
      eventUuid: eventUuid,
      lenient: false,
      bleacherUuids: [],
      bleacherRequirements: requirements,
      sevenRow: 0,
      tenRow: 0,
      fifteenRow: 0,
      seats: 0,
      eventName: state.eventName,
      eventStart: state.eventStart,
      eventEnd: state.eventEnd,
    };
    const alerts = eventRequirements.evaluate({
      event: pseudoEvent as CurrentEventState,
      bleachers: [],
    });
    await eventRequirements.sync(
      eventUuid,
      "event",
      alerts,
      currentUserUuid ?? null,
      state.ownerUserUuid ?? null,
      supabase,
    );
  }

  // 7. Log creation
  await logSingleChange(
    supabase,
    eventUuid,
    currentUserUuid ?? null,
    "event_name",
    null,
    state.eventName,
    "create",
  );

  return eventUuid;
}
