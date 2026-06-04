"use client";

import { use } from "react";
import { QuoteDetailView } from "@/features/quotesAndBookings/components/quoteDetail/QuoteDetailView";

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuoteDetailView eventId={id} />;
}
