import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePublicTabs } from "@/features/quotesAndBookings/pdf/QuotePublicTabs";
import { notFound } from "next/navigation";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ eventUUID: string }>;
}) {
  const { eventUUID } = await params;

  // Public quotes are addressed by event UUID only (non-enumerable). Invoice numbers
  // are a display label, never a route slug. See docs/specs/payment-history-security.md.
  const data = await buildQuoteDocumentData(eventUUID);
  if (!data) {
    notFound();
  }

  return <QuotePublicTabs data={data} />;
}
