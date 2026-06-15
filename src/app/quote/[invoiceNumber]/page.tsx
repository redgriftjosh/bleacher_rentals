import { buildQuoteDocumentDataByInvoice } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePublicTabs } from "@/features/quotesAndBookings/pdf/QuotePublicTabs";
import { notFound } from "next/navigation";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;

  const data = await buildQuoteDocumentDataByInvoice(invoiceNumber);
  if (!data) {
    notFound();
  }

  return <QuotePublicTabs data={data} />;
}
