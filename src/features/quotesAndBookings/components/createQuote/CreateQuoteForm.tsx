"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCreateQuoteStore,
  hasUnsavedChanges,
  captureQuoteBaseline,
} from "../../state/useCreateQuoteStore";
import { QuoteDetailsSection } from "./sections/QuoteDetailsSection";
import { ClientInfoSection } from "./sections/ClientInfoSection";
import { EventDetailsSection } from "./sections/EventDetailsSection";
import { LineItemsSection } from "./sections/LineItemsSection";
import { TotalsDisplay } from "./sections/TotalsDisplay";

import { NotesSection } from "./sections/NotesSection";
import { PaymentScheduleSection } from "./sections/PaymentScheduleSection";
import { TermsSection } from "./sections/TermsSection";
import { AddLineItemModal } from "./modals/AddLineItemModal";
import { NewContactModal } from "./modals/NewContactModal";
import { EditPaymentScheduleModal } from "./modals/EditPaymentScheduleModal";
import { createQuoteEvent } from "../../db/createQuoteEvent";
import { updateQuoteEvent } from "../../db/updateQuoteEvent";
import { logQuoteSentLocal } from "../../db/logQuoteSentLocal";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useAutoTax } from "../../hooks/useAutoTax";
import { useCurrentUserUuid } from "../../hooks/useCurrentUserUuid";
import { triage } from "@/features/alerts/triage";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { useNavigationGuard } from "../../hooks/useNavigationGuard";
import { UnsavedChangesDialog } from "./modals/UnsavedChangesDialog";

export function CreateQuoteForm() {
  const router = useRouter();
  const resetForm = useCreateQuoteStore((s) => s.resetForm);
  const editingEventId = useCreateQuoteStore((s) => s.editingEventId);
  const supabase = useClerkSupabaseClient();
  const currentUserUuid = useCurrentUserUuid();
  const [saving, setSaving] = useState(false);
  const perms = usePermissionsStore();
  // Review-gating disabled per boss feedback — all AMs can send quotes
  // const canSendDirectly = perms.isAdmin || perms.leadZoneIds.length > 0;
  const canSendDirectly = perms.isAdmin || perms.isAccountManager;

  // Auto-fetch tax from QBO when office + address are set
  const { qboError } = useAutoTax();

  const isEditing = !!editingEventId;

  const validateRequiredFields = (): boolean => {
    const state = useCreateQuoteStore.getState();
    const missing: string[] = [];

    if (!state.salesOfficeId) missing.push("Sales Office");
    if (!state.contactId) missing.push("Contact");
    if (!state.eventName.trim()) missing.push("Event Name");
    if (!state.eventAddressData) missing.push("Event Address");
    if (!state.eventTypeId) missing.push("Event Type");
    if (!state.eventStart) missing.push("Event Start");
    if (!state.eventEnd) missing.push("Event End");
    if (state.lineItems.length === 0) missing.push("Line Items");
    if (!state.termsDocumentId) missing.push("Terms and Conditions");

    if (missing.length > 0) {
      createErrorToast([`Required fields missing: ${missing.join(", ")}`]);
      return false;
    }

    const today = new Date().toISOString().split("T")[0];
    const dateErrors: string[] = [];
    if (state.eventStart < today) dateErrors.push("Event Start cannot be in the past");
    if (state.eventEnd < today) dateErrors.push("Event End cannot be in the past");
    if (state.quoteValidTill && state.quoteValidTill < today)
      dateErrors.push("Quote Valid Till cannot be in the past");
    if (state.eventEnd < state.eventStart)
      dateErrors.push("Event End cannot be before Event Start");
    if (state.quoteValidTill && state.eventStart && state.quoteValidTill > state.eventStart)
      dateErrors.push("Quote Valid Till cannot be after Event Start");

    if (dateErrors.length > 0) {
      createErrorToast(dateErrors);
      return false;
    }

    return true;
  };

  const handleCancel = () => {
    resetForm();
    captureQuoteBaseline(); // explicit exit — don't trip the unsaved-changes guard
    if (isEditing) {
      router.push(`/quotes-bookings/${editingEventId}`);
    } else {
      router.push("/quotes-bookings");
    }
  };

  /**
   * Validate + persist the quote without navigating. Returns the event id on
   * success (used by the Save button and the unsaved-changes guard), or null
   * on validation failure / error.
   */
  const persistQuote = async (): Promise<string | null> => {
    if (!validateRequiredFields()) return null;
    setSaving(true);
    try {
      const state = useCreateQuoteStore.getState();
      let eventId: string;
      if (isEditing) {
        await updateQuoteEvent(editingEventId, state, supabase, currentUserUuid ?? perms.userId);
        eventId = editingEventId;
      } else {
        eventId = await createQuoteEvent(state, supabase, currentUserUuid ?? perms.userId);
      }
      void triage("Events", { id: eventId }, supabase);
      createSuccessToast([isEditing ? "Quote updated." : "Quote draft saved."]);
      resetForm();
      captureQuoteBaseline(); // form is clean again — no spurious leave prompt
      return eventId;
    } catch {
      // Error toast already shown
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const eventId = await persistQuote();
    if (eventId) router.push(`/quotes-bookings/${eventId}`);
  };

  // Unsaved-changes guard for in-app navigation (sidebar, links, back button).
  const guard = useNavigationGuard(() => hasUnsavedChanges() && !saving);

  const handleGuardSave = async () => {
    const eventId = await persistQuote();
    if (eventId) guard.confirm();
    else guard.cancel(); // validation failed — stay so the user can fix it
  };

  const handleGuardDiscard = () => {
    resetForm();
    captureQuoteBaseline();
    guard.confirm();
  };

  const handlePreviewPdf = async () => {
    if (!validateRequiredFields()) return;
    setSaving(true);
    try {
      const state = useCreateQuoteStore.getState();
      let eventId: string;
      if (isEditing) {
        await updateQuoteEvent(editingEventId, state, supabase, currentUserUuid ?? perms.userId);
        eventId = editingEventId;
      } else {
        eventId = await createQuoteEvent(state, supabase, currentUserUuid ?? perms.userId);
      }
      void triage("Events", { id: eventId }, supabase);
      // Open preview in new tab, keep form open
      window.open(`/quotes-bookings/${eventId}/preview`, "_blank");
      if (!isEditing) {
        // Update store so subsequent saves do UPDATE not INSERT
        useCreateQuoteStore.getState().setField("editingEventId", eventId);
      }
    } catch {
      // Error toast already shown
    } finally {
      setSaving(false);
    }
  };

  const handleSendQuote = async () => {
    if (!validateRequiredFields()) return;
    setSaving(true);
    try {
      // Override status to "quoted" when sending
      useCreateQuoteStore.getState().setField("status", "quoted");
      const state = useCreateQuoteStore.getState();
      let eventId: string;
      if (isEditing) {
        await updateQuoteEvent(editingEventId, state, supabase, currentUserUuid ?? perms.userId);
        eventId = editingEventId;
      } else {
        eventId = await createQuoteEvent(state, supabase, currentUserUuid ?? perms.userId);
      }
      void triage("Events", { id: eventId }, supabase);

      // Collect recipient emails (main + optional finance contact)
      const recipientEmails: string[] = [];
      const mainEmail = state.companyEmail || state.contactName;
      if (mainEmail?.includes("@")) recipientEmails.push(mainEmail);
      if (state.financeContactEmail?.includes("@")) recipientEmails.push(state.financeContactEmail);

      if (recipientEmails.length === 0) {
        createSuccessToast(["Quote saved. Add a contact email to send."]);
        resetForm();
        router.push(`/quotes-bookings/${eventId}`);
        return;
      }

      // Send email with PDF via API
      const res = await fetch(`/api/quotes/${eventId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmails }),
      });

      if (res.ok) {
        // Log the send via PowerSync so it records the current user (the sender).
        await logQuoteSentLocal({
          eventId,
          recipientLine: recipientEmails.join(","),
          currentUserUuid: currentUserUuid ?? perms.userId,
        });
        createSuccessToast([`Quote sent to ${recipientEmails.join(", ")}`]);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Send failed:", err);
        createSuccessToast(["Quote saved but email failed. Try resending from the detail page."]);
      }

      resetForm();
      router.push(`/quotes-bookings/${eventId}`);
    } catch {
      // Error toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isEditing ? "Edit Quote" : "Create Quote"}</h1>
        <button
          onClick={handleCancel}
          className="p-2 text-gray-500 hover:text-gray-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {qboError && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
          Failed to load tax data from QuickBooks. Make sure QuickBooks is connected to this Sales Office. If you have access,{" "}
          <a href="/quickbooks" className="underline font-semibold hover:text-red-800">
            go to the QuickBooks page
          </a>{" "}
          to authenticate a connection.
        </div>
      )}

      <div className="space-y-8">
        <QuoteDetailsSection />
        <ClientInfoSection />
        <EventDetailsSection />

        <LineItemsSection />
        <TotalsDisplay />

        <PaymentScheduleSection />
        <NotesSection />
        <TermsSection />
      </div>

      <div className="flex items-center justify-between pt-6 pb-4 mt-8 border-t border-gray-200">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handlePreviewPdf}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
          >
            Preview PDF
          </button>
          {canSendDirectly && (
            <button
              onClick={handleSendQuote}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Send Quote →"}
            </button>
          )}
        </div>
      </div>

      <AddLineItemModal />
      <NewContactModal />
      <EditPaymentScheduleModal />
      <UnsavedChangesDialog
        open={guard.isBlocking}
        saving={saving}
        onSave={handleGuardSave}
        onDiscard={handleGuardDiscard}
        onCancel={guard.cancel}
      />
    </div>
  );
}
