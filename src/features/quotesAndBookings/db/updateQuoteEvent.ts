import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesUpdate } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { CreateQuoteState } from "../state/useCreateQuoteStore";
import { syncPaymentInstallments } from "./paymentInstallments";
import { calculateTotals } from "../utils/calculateTotals";
import { logEventChanges, logLineItemChanges, TRACKED_FIELDS, SimpleLineItem } from "./logEventChanges";
import { eventRequirements } from "@/features/alerts/definitions/eventRequirements";
import { CurrentEventState } from "@/features/eventConfiguration/state/useCurrentEventStore";

/**
 * Updates an existing quote/event.
 * 1. Upsert address if changed
 * 2. Update Event row
 */
export async function updateQuoteEvent(
  eventId: string,
  state: CreateQuoteState,
  supabase: SupabaseClient<Database>,
  currentUserUuid?: string | null,
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

  // 2. Fetch old state for change logging
  const [{ data: oldEvent }, { data: oldLineItemRows }] = await Promise.all([
    supabase
      .from("Events")
      .select(TRACKED_FIELDS.join(", "))
      .eq("id", eventId)
      .single(),
    supabase
      .from("EventLineItems")
      .select("header, quantity, value_cents, currency")
      .eq("event_uuid", eventId)
      .eq("deleted", false),
  ]);

  const oldLineItems: SimpleLineItem[] = (oldLineItemRows ?? []).map((r: any) => ({
    label: r.header ?? "",
    qty: r.quantity ?? 1,
    unitPriceCents: r.value_cents ?? 0,
    lineTotalCents: (r.value_cents ?? 0) * (r.quantity ?? 1),
  }));

  // 3. Update Event
  const { taxAmount } = calculateTotals(state.lineItems, state.taxPercent);
  const effectiveTaxCents = state.taxOverrideCents ?? Math.round(taxAmount);
  const contractRevenueCents = state.lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0) + effectiveTaxCents;

  const updates: TablesUpdate<"Events"> = {
    event_name: state.eventName,
    event_start: state.eventStart || undefined,
    event_end: state.eventEnd || undefined,
    event_status: state.status || "draft",
    event_type_uuid: state.eventTypeId || null,
    quote_valid_till: state.quoteValidTill || null,
    contract_revenue_cents: contractRevenueCents,
    tax_percent: state.taxPercent,
    tax_amount_cents: effectiveTaxCents,
    notes: state.clientFacingNotes || null,
    internal_notes: state.internalNotes || null,
    external_notes: state.clientFacingNotes || null,
    created_by_user_uuid: state.ownerUserUuid ?? undefined,
    contact_uuid: state.contactId || null,
    finance_contact_uuid: state.financeContactId || null,
    sales_office_uuid: state.salesOfficeId || null,
    terms_and_conditions_uuid: state.termsDocumentId || null,
  };

  if (addressUuid) {
    updates.address_uuid = addressUuid;
  }

  const { error } = await supabase.from("Events").update(updates).eq("id", eventId);

  if (error) {
    createErrorToast(["Failed to update quote.", error.message ?? ""]);
  }

  // 4. Log field changes + line item changes in parallel
  if (oldEvent) {
    const newState: Record<string, unknown> = {};
    for (const key of TRACKED_FIELDS) {
      if (key in updates) {
        newState[key] = (updates as Record<string, unknown>)[key] ?? null;
      }
    }

    const newLineItems: SimpleLineItem[] = state.lineItems.map((li) => ({
      label: li.label,
      qty: li.qty,
      unitPriceCents: li.category === "discounts" ? li.lineTotalCents : li.unitPriceCents,
      lineTotalCents: li.lineTotalCents,
    }));

    await Promise.all([
      logEventChanges(
        supabase,
        eventId,
        currentUserUuid ?? null,
        oldEvent as unknown as Record<string, unknown>,
        newState,
        "update",
        state.currency,
      ),
      logLineItemChanges(
        supabase,
        eventId,
        currentUserUuid ?? null,
        oldLineItems,
        newLineItems,
        state.currency,
      ),
    ]);
  }

  // 5. Sync line items (delete old, insert new)
  if (state.lineItems.length > 0) {
    await supabase.from("EventLineItems").delete().eq("event_uuid", eventId);

    const lineItemRows = state.lineItems.map((li) => ({
      event_uuid: eventId,
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
      console.error("Line items sync failed (quote still saved):", lineItemError.message);
    }
  }

  // 6. Derive bleacher requirements from line items for alert evaluation
  const reqMap = new Map<string, number>();
  for (const li of state.lineItems) {
    if (li.category === "bleachers" && li.bleacherTypeUuid) {
      reqMap.set(li.bleacherTypeUuid, (reqMap.get(li.bleacherTypeUuid) ?? 0) + li.qty);
    }
  }

  // 7. Evaluate "requirements not met" alert
  const requirements = [...reqMap.entries()].map(([btUuid, qty]) => ({
    bleacherTypeUuid: btUuid,
    quantity: qty,
  }));

  // Fetch currently assigned bleachers to compare
  const { data: assignedBleacherRows } = await supabase
    .from("BleacherEvents")
    .select("bleacher_uuid")
    .eq("event_uuid", eventId);
  const assignedUuids = (assignedBleacherRows ?? []).map((r) => r.bleacher_uuid).filter(Boolean) as string[];

  let assignedBleachers: { id: string; bleacher_type_uuid: string | null; bleacher_rows: number; bleacher_seats: number }[] = [];
  if (assignedUuids.length > 0) {
    const { data: bleacherRows } = await supabase
      .from("Bleachers")
      .select("id, bleacher_type_uuid, bleacher_rows, bleacher_seats")
      .in("id", assignedUuids);
    assignedBleachers = (bleacherRows ?? []) as typeof assignedBleachers;
  }

  const pseudoEvent: Partial<CurrentEventState> = {
    eventUuid: eventId,
    lenient: false,
    bleacherUuids: assignedUuids,
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
    bleachers: assignedBleachers as any,
  });
  await eventRequirements.sync(
    eventId,
    "event",
    alerts,
    currentUserUuid ?? null,
    state.ownerUserUuid ?? null,
    supabase,
  );

  // 8. Sync payment installments
  try {
    await syncPaymentInstallments(eventId, state.paymentInstallments, state.currency);
  } catch (e) {
    console.error("Payment installments sync failed (quote still saved):", e);
  }
}
