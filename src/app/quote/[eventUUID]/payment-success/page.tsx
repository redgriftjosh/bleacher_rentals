import { PaymentSuccessView } from "@/features/quotesAndBookings/pdf/PaymentSuccessView";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ eventUUID: string }>;
}) {
  const { eventUUID } = await params;

  return <PaymentSuccessView eventUUID={eventUUID} />;
}
