"use client";

import { useEffect } from "react";
import { CreateQuoteForm } from "@/features/quotesAndBookings/components/createQuote/CreateQuoteForm";
import {
  useCreateQuoteStore,
  hasUnsavedChanges,
  captureQuoteBaseline,
} from "@/features/quotesAndBookings/state/useCreateQuoteStore";

export default function NewQuotePage() {
  const resetForm = useCreateQuoteStore((s) => s.resetForm);
  const editingEventId = useCreateQuoteStore((s) => s.editingEventId);

  useEffect(() => {
    if (editingEventId) {
      resetForm();
    }
    // Snapshot the starting state (fresh form or a restored draft) so the guard
    // only fires on changes made after the page opened.
    captureQuoteBaseline();
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
