"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateQuoteForm } from "@/features/quotesAndBookings/components/createQuote/CreateQuoteForm";
import { useCreateQuoteStore } from "@/features/quotesAndBookings/state/useCreateQuoteStore";
import { loadQuoteIntoStore } from "@/features/quotesAndBookings/db/loadQuoteIntoStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useClerkSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const resetForm = useCreateQuoteStore((s) => s.resetForm);
  const setField = useCreateQuoteStore((s) => s.setField);

  useEffect(() => {
    // Reset form before loading to clear any stale data
    resetForm();

    loadQuoteIntoStore(id, supabase).then((eventId) => {
      if (!eventId) {
        router.push("/quotes-bookings");
        return;
      }
      setField("editingEventId", eventId);
      setLoading(false);
    });
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading quote...</p>
      </div>
    );
  }

  return <CreateQuoteForm />;
}
