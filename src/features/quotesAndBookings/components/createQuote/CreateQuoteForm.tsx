"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateQuoteStore } from "../../state/useCreateQuoteStore";
import { QuoteDetailsSection } from "./sections/QuoteDetailsSection";
import { ClientInfoSection } from "./sections/ClientInfoSection";
import { EventDetailsSection } from "./sections/EventDetailsSection";
import { LineItemsSection } from "./sections/LineItemsSection";
import { TotalsDisplay } from "./sections/TotalsDisplay";
import { PaymentInfoSection } from "./sections/PaymentInfoSection";
import { NotesSection } from "./sections/NotesSection";
import { TermsSection } from "./sections/TermsSection";
import { SendOptionsSection } from "./sections/SendOptionsSection";
import { AddLineItemModal } from "./modals/AddLineItemModal";
import { NewContactModal } from "./modals/NewContactModal";
import { NewCompanyModal } from "./modals/NewCompanyModal";

export function CreateQuoteForm() {
  const router = useRouter();
  const resetForm = useCreateQuoteStore((s) => s.resetForm);

  const handleCancel = () => {
    resetForm();
    router.push("/quotes-bookings");
  };

  const handleSaveDraft = () => {
    const state = useCreateQuoteStore.getState();
    console.log("Save Draft:", state);
  };

  const handlePreviewPdf = () => {
    console.log("Preview PDF");
  };

  const handleSendQuote = () => {
    const state = useCreateQuoteStore.getState();
    console.log("Send Quote:", state);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create Quote</h1>
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

        <PaymentInfoSection />
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
            onClick={handleSaveDraft}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
          >
            Save Draft
          </button>
          <button
            onClick={handlePreviewPdf}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
          >
            Preview PDF
          </button>
          <button
            onClick={handleSendQuote}
            className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer"
          >
            Send Quote →
          </button>
        </div>
      </div>

      <AddLineItemModal />
      <NewContactModal />
      <NewCompanyModal />
    </div>
  );
}
