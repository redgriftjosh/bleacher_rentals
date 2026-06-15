"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateQuoteStore } from "../../state/useCreateQuoteStore";
import { QuoteDetailsSection } from "./sections/QuoteDetailsSection";
import { ClientInfoSection } from "./sections/ClientInfoSection";
import { EventDetailsSection } from "./sections/EventDetailsSection";
import { LineItemsSection } from "./sections/LineItemsSection";
import { TotalsDisplay } from "./sections/TotalsDisplay";

import { NotesSection } from "./sections/NotesSection";
import { PaymentScheduleSection } from "./sections/PaymentScheduleSection";
import { TermsSection } from "./sections/TermsSection";
import { SendOptionsSection } from "./sections/SendOptionsSection";
import { AddLineItemModal } from "./modals/AddLineItemModal";
import { NewContactModal } from "./modals/NewContactModal";
import { NewCompanyModal } from "./modals/NewCompanyModal";
import { EditPaymentScheduleModal } from "./modals/EditPaymentScheduleModal";
import { createQuoteEvent } from "../../db/createQuoteEvent";
import { updateQuoteEvent } from "../../db/updateQuoteEvent";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { useAutoTax } from "../../hooks/useAutoTax";
import { useCurrentUserUuid } from "../../hooks/useCurrentUserUuid";

export function CreateQuoteForm() {
  const router = useRouter();
  const resetForm = useCreateQuoteStore((s) => s.resetForm);
  const editingEventId = useCreateQuoteStore((s) => s.editingEventId);
  const supabase = useClerkSupabaseClient();
  const currentUserUuid = useCurrentUserUuid();
  const [saving, setSaving] = useState(false);

  // Auto-fetch tax from QBO when office + address are set
  useAutoTax();

  const isEditing = !!editingEventId;

  const handleCancel = () => {
    resetForm();
    if (isEditing) {
      router.push(`/quotes-bookings/${editingEventId}`);
    } else {
      router.push("/quotes-bookings");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const state = useCreateQuoteStore.getState();
      if (isEditing) {
        await updateQuoteEvent(editingEventId, state, supabase, currentUserUuid);
        createSuccessToast(["Quote updated."]);
        resetForm();
        router.push(`/quotes-bookings/${editingEventId}`);
      } else {
        const eventId = await createQuoteEvent(state, supabase, currentUserUuid);
        createSuccessToast(["Quote draft saved."]);
        resetForm();
        router.push(`/quotes-bookings/${eventId}`);
      }
    } catch {
      // Error toast already shown
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewPdf = async () => {
    setSaving(true);
    try {
      const state = useCreateQuoteStore.getState();
      let eventId: string;
      if (isEditing) {
        await updateQuoteEvent(editingEventId, state, supabase, currentUserUuid);
        eventId = editingEventId;
      } else {
        eventId = await createQuoteEvent(state, supabase, currentUserUuid);
      }
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
    setSaving(true);
    try {
      // Override status to "quoted" when sending
      useCreateQuoteStore.getState().setField("status", "quoted");
      const state = useCreateQuoteStore.getState();
      let eventId: string;
      if (isEditing) {
        await updateQuoteEvent(editingEventId, state, supabase, currentUserUuid);
        eventId = editingEventId;
      } else {
        eventId = await createQuoteEvent(state, supabase, currentUserUuid);
      }

      // Determine recipient email
      const recipientEmail = state.companyEmail || state.contactName;
      if (!recipientEmail || !recipientEmail.includes("@")) {
        createSuccessToast(["Quote saved. Add a contact email to send."]);
        resetForm();
        router.push(`/quotes-bookings/${eventId}`);
        return;
      }

      // Send email with PDF via API
      const res = await fetch(`/api/quotes/${eventId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail }),
      });

      if (res.ok) {
        createSuccessToast([`Quote sent to ${recipientEmail}`]);
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

      <div className="space-y-8">
        <QuoteDetailsSection />
        <ClientInfoSection />
        <EventDetailsSection />

        <LineItemsSection />
        <TotalsDisplay />

        <PaymentScheduleSection />
        <NotesSection />
        <TermsSection />
        <SendOptionsSection />
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
          <button
            onClick={handleSendQuote}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Send Quote →"}
          </button>
        </div>
      </div>

      <AddLineItemModal />
      <NewContactModal />
      <NewCompanyModal />
      <EditPaymentScheduleModal />
    </div>
  );
}
