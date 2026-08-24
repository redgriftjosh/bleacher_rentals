import { PaymentSuccessView } from "@/features/quotesAndBookings/pdf/PaymentSuccessView";
import { resolveQuoteLanguage } from "@/features/quotesAndBookings/pdf/quoteDocumentData";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ eventUUID: string }>;
}) {
  const { eventUUID } = await params;
  const language = await resolveQuoteLanguage(eventUUID);

  return <PaymentSuccessView eventUUID={eventUUID} language={language} />;
}
