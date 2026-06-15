"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, FileText, Pencil, Check, X, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { QuoteDocumentData } from "./quoteDocumentData";

function formatMoney(cents: number, currency: "USD" | "CAD"): string {
  const symbol = currency === "CAD" ? "C$" : "$";
  const formatted = (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function formatDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type PaymentHistoryRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method_type: string | null;
  payer_name: string;
  payer_email: string | null;
  stripe_receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
};

export function PayInvoiceTab({ data }: { data: QuoteDocumentData }) {
  const { currency } = data;
  const [payerName, setPayerName] = useState(data.contact?.name ?? "");
  const [payerEmail, setPayerEmail] = useState(data.contact?.email ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [poNumber, setPoNumber] = useState(data.poNumber ?? "");
  const [editingPo, setEditingPo] = useState(false);
  const [poSaving, setPoSaving] = useState(false);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/history?eventId=${data.eventId}`);
      if (res.ok) {
        const rows = await res.json();
        setPayments(rows);
      }
    } catch {
      // silently fail
    } finally {
      setPaymentsLoading(false);
    }
  }, [data.eventId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const paidCents = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const totalDue = data.totalCents;
  const remainingCents = totalDue - paidCents;

  const nextInstallment = data.paymentSchedule.find((i) => i.status !== "paid");

  const payAmount = nextInstallment ? nextInstallment.amountCents : remainingCents;
  const payAmountPositive = Math.max(payAmount, 0);

  async function handlePay() {
    if (!payerName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: data.eventId,
          installmentId: nextInstallment ? undefined : undefined,
          amountCents: payAmountPositive,
          currency,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function savePo() {
    setPoSaving(true);
    try {
      await fetch(`/api/events/${data.eventId}/po`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poNumber }),
      });
      setEditingPo(false);
    } catch {
      // silently fail
    } finally {
      setPoSaving(false);
    }
  }

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const paymentStatus = urlParams?.get("payment");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Success / cancel banners */}
      {paymentStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800">Payment Successful!</p>
            <p className="text-sm text-green-700">Your payment has been processed. A receipt will be sent to your email.</p>
          </div>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">Payment was cancelled. You can try again when ready.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column — payment card + schedule */}
        <div className="md:col-span-2 space-y-6">
          {/* Amount Due Card */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Amount Due</h3>
              <span className="text-2xl font-bold text-blue-600">
                {formatMoney(Math.max(remainingCents, 0), currency)}
              </span>
            </div>

            {remainingCents <= 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-800">Paid in Full</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePay}
                  disabled={isLoading || !payerName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-5 h-5" />
                  {isLoading ? "Redirecting to Stripe..." : `Pay ${formatMoney(payAmountPositive, currency)} Online`}
                </button>
              </>
            )}
          </div>

          {/* Payment Schedule */}
          {data.paymentSchedule.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Payment Schedule</h3>
              <div className="space-y-3">
                {data.paymentSchedule.map((inst, i) => {
                  const isPaid = inst.status === "paid";
                  const isFirst = i === 0;
                  const isLast = i === data.paymentSchedule.length - 1;
                  let label = `Due on ${formatDate(inst.dueDate)}`;
                  if (isFirst) label = "Due Now";
                  else if (isLast) label = `Final Due on ${formatDate(inst.dueDate)}`;

                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isPaid ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPaid ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          {isPaid && (
                            <p className="text-xs text-green-600">Paid</p>
                          )}
                        </div>
                      </div>
                      <span className={`font-semibold ${isPaid ? "text-green-700" : "text-gray-900"}`}>
                        {formatMoney(inst.amountCents, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="text-gray-600">Total Scheduled</span>
                <span className="font-semibold">
                  {formatMoney(
                    data.paymentSchedule.reduce((s, i) => s + i.amountCents, 0),
                    currency,
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Payment History</h3>
            {paymentsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">{formatDate(p.paid_at ?? p.created_at)}</td>
                        <td className="py-2 font-medium">
                          {formatMoney(p.amount_cents, (p.currency ?? "USD") as "USD" | "CAD")}
                        </td>
                        <td className="py-2 capitalize">{p.payment_method_type ?? "card"}</td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.status === "succeeded"
                                ? "bg-green-100 text-green-700"
                                : p.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.status === "succeeded" && <Check className="w-3 h-3" />}
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {p.stripe_receipt_url && (
                            <a
                              href={p.stripe_receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column — invoice summary + info */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice #</span>
                <span className="font-medium">{data.quoteNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Event</span>
                <span className="font-medium text-right max-w-[160px] truncate">{data.venue.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-medium">{formatMoney(totalDue, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium text-green-600">{formatMoney(paidCents, currency)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-800 font-medium">Remaining</span>
                <span className="font-bold text-blue-600">
                  {formatMoney(Math.max(remainingCents, 0), currency)}
                </span>
              </div>
            </div>
          </div>

          {/* PO Number */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Purchase Order #</h3>
            {editingPo ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="flex-1 border rounded-md px-3 py-1.5 text-sm"
                  placeholder="Enter PO number"
                  autoFocus
                />
                <button
                  onClick={savePo}
                  disabled={poSaving}
                  className="text-green-600 hover:text-green-700 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setPoNumber(data.poNumber ?? "");
                    setEditingPo(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{poNumber || "Not set"}</span>
                <button
                  onClick={() => setEditingPo(true)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Make Checks Payable */}
          <div className="bg-gray-50 border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Make Checks Payable To</h3>
            <p className="text-sm text-gray-600">{data.company.name}</p>
            {data.company.street && (
              <p className="text-sm text-gray-600">{data.company.street}</p>
            )}
            {(data.company.city || data.company.state) && (
              <p className="text-sm text-gray-600">
                {data.company.city}, {data.company.state} {data.company.zip}
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="bg-gray-50 border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Questions?</h3>
            <p className="text-sm text-gray-600">{data.company.email}</p>
            {data.company.phone && (
              <p className="text-sm text-gray-600">{data.company.phone}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
