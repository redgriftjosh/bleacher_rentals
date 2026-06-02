import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePublicView } from "@/features/quotesAndBookings/pdf/QuotePublicView";
import { notFound } from "next/navigation";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await buildQuoteDocumentData(id);
  if (!data) {
    notFound();
  }

  return <QuotePublicView data={data} />;
}
