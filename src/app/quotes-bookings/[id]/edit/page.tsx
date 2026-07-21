"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateQuoteForm } from "@/features/quotesAndBookings/components/createQuote/CreateQuoteForm";
import {
  useCreateQuoteStore,
  hasUnsavedChanges,
  captureQuoteBaseline,
} from "@/features/quotesAndBookings/state/useCreateQuoteStore";
import { loadQuoteIntoStore } from "@/features/quotesAndBookings/db/loadQuoteIntoStore";

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const resetForm = useCreateQuoteStore((s) => s.resetForm);
  const setField = useCreateQuoteStore((s) => s.setField);

  useEffect(() => {
    resetForm();

    loadQuoteIntoStore(id).then((eventId) => {
      if (!eventId) {
        router.push("/quotes-bookings");
        return;
      }
      setField("editingEventId", eventId);
      // Baseline = the loaded quote, so an untouched edit page is not "dirty".
      captureQuoteBaseline();
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading quote...</p>
      </div>
    );
  }

  return <CreateQuoteForm />;
}
