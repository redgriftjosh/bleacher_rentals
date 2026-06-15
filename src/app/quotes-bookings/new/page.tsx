"use client";

import { useEffect } from "react";
import { CreateQuoteForm } from "@/features/quotesAndBookings/components/createQuote/CreateQuoteForm";
import { useCreateQuoteStore } from "@/features/quotesAndBookings/state/useCreateQuoteStore";
import { hasUnsavedChanges } from "@/features/quotesAndBookings/state/useCreateQuoteStore";

export default function NewQuotePage() {
  const resetForm = useCreateQuoteStore((s) => s.resetForm);
  const editingEventId = useCreateQuoteStore((s) => s.editingEventId);

  useEffect(() => {
    if (editingEventId) {
      resetForm();
    }
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return <CreateQuoteForm />;
}
