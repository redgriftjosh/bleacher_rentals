"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { QuoteDetail } from "../../../db/fetchQuoteDetail";
import { setEventIsQbo } from "../../../db/setEventIsQbo";
import { useEventIsQbo } from "../../../hooks/useEventIsQbo";
import { usePaymentInstallments } from "../../../hooks/usePaymentInstallments";
import { usePaymentHistory, PaymentHistoryRow } from "../../../hooks/usePaymentHistory";
import { useEventCurrency } from "../../../hooks/useEventCurrency";
import { allocatePayments, type Allocation } from "../../../utils/allocatePayments";
import { formatMoney } from "../../../utils/formatMoney";
import { Currency } from "../../../types/quoteTypes";
import { formatDate, formatDateTime } from "../../../utils/formatDate";
import { paymentMethodLabel } from "../../../types/paymentTypes";
import { useUserNames } from "../../../hooks/useUserNames";
import dynamic from "next/dynamic";

// A modal most visits to this tab never open, carrying a date control and its
// own form state. It has no business in the tab's bundle.
const RecordPaymentDialog = dynamic(
  () => import("./RecordPaymentDialog").then((m) => m.RecordPaymentDialog),
  { ssr: false },
);

const STATUS_STYLES = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  unpaid: "bg-yellow-100 text-yellow-800",
} as const;

const STATUS_LABELS = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" } as const;

function PaymentScheduleTable({
  allocation,
  currency,
}: {
  allocation: Allocation;
  currency: Currency;
}) {
  if (allocation.installments.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center border rounded">
        No payment schedule set. Edit the quote to add installments.
      </p>
    );
  }

  const totalCents = allocation.installments.reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Due Date</th>
            <th className="py-2 font-medium text-right">Amount</th>
            <th className="py-2 font-medium text-center">Status</th>
            <th className="py-2 font-medium">Paid At</th>
          </tr>
        </thead>
        <tbody>
          {allocation.installments.map((inst, i) => (
            <tr key={inst.installmentId} className="border-b">
              <td className="py-2 text-gray-400">{i + 1}</td>
              <td className="py-2">{formatDate(inst.dueDate)}</td>
              <td className="py-2 text-right font-medium">
                {formatMoney(inst.amountCents, currency)}
              </td>
              <td className="py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[inst.status]}`}>
                  {STATUS_LABELS[inst.status]}
                </span>
                {/* A partial row must say how far it actually got — this is the
                    number a $1.00 payment used to hide. */}
                {inst.status === "partial" && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatMoney(inst.allocatedCents, currency)} of{" "}
                    {formatMoney(inst.amountCents, currency)}
                  </div>
                )}
              </td>
              <td className="py-2 text-gray-500">
                {inst.paidAt ? formatDateTime(inst.paidAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-gray-500">Scheduled Total</span>
          <span className="font-medium w-24 text-right">{formatMoney(totalCents, currency)}</span>
        </div>
        <div className="flex gap-8 text-green-600">
          <span>Covered</span>
          <span className="font-medium w-24 text-right">
            {formatMoney(allocation.allocatedCents, currency)}
          </span>
        </div>
        <div className="flex gap-8 border-t pt-1 mt-1">
          <span className="font-semibold">Remaining</span>
          <span className="font-bold w-24 text-right">
            {formatMoney(totalCents - allocation.allocatedCents, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Where a payment's money actually sits now — not the installment it was
 * originally aimed at, which a schedule edit can leave pointing at nothing.
 */
function AppliedTo({
  payment,
  allocation,
  currency,
}: {
  payment: PaymentHistoryRow;
  allocation: Allocation;
  currency: Currency;
}) {
  const detail = allocation.byPayment.find((p) => p.paymentId === payment.id);

  if (detail?.excluded === "currency") {
    return <span className="text-amber-700">Not counted ({payment.currency})</span>;
  }
  if (detail?.excluded === "status") {
    return <span className="text-gray-400">Not counted ({payment.status})</span>;
  }
  if (!detail || detail.parts.length === 0) {
    return <span className="text-gray-400">Unapplied</span>;
  }

  const dueDates = new Map(
    allocation.installments.map((i) => [i.installmentId, formatDate(i.dueDate)]),
  );

  // Split money, or money the schedule cannot absorb, has to name its pieces —
  // otherwise "Due Aug 31" would quietly stand for a payment twice that size.
  // A refund's pieces are negative: it names the installment it reopened, and
  // `!== 0` rather than `> 0` is what keeps that visible instead of blank.
  const leftover = detail.unallocatedCents;
  const showAmounts = detail.parts.length > 1 || leftover !== 0 || payment.amountCents < 0;

  return (
    <span>
      {detail.parts.map((part, i) => (
        <span key={part.installmentId}>
          {i > 0 && " · "}
          Due {dueDates.get(part.installmentId) ?? "—"}
          {showAmounts && ` (${formatMoney(part.cents, currency)})`}
        </span>
      ))}
      {leftover !== 0 && (
        <span className="text-gray-400">
          {detail.parts.length > 0 && " · "}
          Unapplied ({formatMoney(leftover, currency)})
        </span>
      )}
    </span>
  );
}

export function BillingTab({
  quote,
  contractTotalCents,
  canEdit,
}: {
  quote: QuoteDetail;
  contractTotalCents: number;
  canEdit: boolean;
}) {
  const { installments, isLoading } = usePaymentInstallments(quote.id);
  const { payments, isLoading: paymentsLoading } = usePaymentHistory(quote.id);
  const currency = useEventCurrency(quote.id);
  const storedIsQbo = useEventIsQbo(quote.id);
  const perms = usePermissionsStore();
  const staffNames = useUserNames();

  const [dialogOpen, setDialogOpen] = useState(false);

  // A viewer is anyone who can read the page but holds neither of the roles the
  // RLS insert policy names. Showing them a button the server would refuse is
  // worse than showing nothing.
  const isViewer = !perms.isAdmin && !perms.isAccountManager;

  // Every figure on this tab comes from the money in PaymentHistory. The
  // schedule supplies only the terms — what is owed, and when.
  // See docs/specs/payment-accounting-truth.md.
  const allocation = useMemo(
    () => allocatePayments(installments, payments, currency),
    [installments, payments, currency],
  );

  const receivedCents = allocation.totalReceivedCents;
  const balanceDueCents = Math.max(0, contractTotalCents - receivedCents);
  const overpaidCents = Math.max(0, receivedCents - contractTotalCents);

  // Optimistic value: the write goes to the local DB and only then comes back
  // through the reactive query, which is enough of a round trip to look laggy.
  // We draw the user's own click immediately and drop the override once the DB
  // agrees (or the write fails).
  const [pendingIsQbo, setPendingIsQbo] = useState<boolean | null>(null);
  const isQbo = pendingIsQbo ?? storedIsQbo;

  useEffect(() => {
    if (pendingIsQbo !== null && pendingIsQbo === storedIsQbo) setPendingIsQbo(null);
  }, [pendingIsQbo, storedIsQbo]);

  // Writes are chained so that fast on/off/on clicking cannot land out of order
  // and leave the row disagreeing with the box.
  const qboWriteQueue = useRef<Promise<unknown>>(Promise.resolve());

  const handleQboChange = (checked: boolean) => {
    setPendingIsQbo(checked);
    qboWriteQueue.current = qboWriteQueue.current
      .then(() =>
        setEventIsQbo({
          eventId: quote.id,
          isQbo: checked,
          currentUserUuid: perms.userId,
        }),
      )
      .catch((err: any) => {
        setPendingIsQbo(null); // fall back to whatever the DB actually holds
        createErrorToast(["Failed to update the QuickBooks flag.", err?.message ?? ""]);
      });
  };

  return (
    <div className="space-y-6">
      {allocation.foreignCurrencyPayments.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 text-sm rounded p-3">
          {allocation.foreignCurrencyPayments.length === 1 ? "1 payment" : "Some payments"} in{" "}
          {[...new Set(allocation.foreignCurrencyPayments.map((p) => p.currency))].join(", ")}{" "}
          {allocation.foreignCurrencyPayments.length === 1 ? "is" : "are"} not included in this
          balance, which is in {currency}. Reconcile them by hand.
        </div>
      )}

      {/* Payment Summary */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Payment Summary
        </h3>
        <div className="space-y-2 text-sm max-w-md">
          <div className="flex justify-between">
            <span>Contract Total</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatMoney(contractTotalCents, currency)}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  quote.eventStatus === "booked"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {quote.eventStatus ?? "Draft"}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Payments Received</span>
            <span className="font-semibold">{formatMoney(receivedCents, currency)}</span>
          </div>
          <div className="flex justify-between text-red-600 border-t pt-2">
            <span className="font-medium">Balance Due</span>
            <span className="font-bold">{formatMoney(balanceDueCents, currency)}</span>
          </div>
          {overpaidCents > 0 && (
            <div className="flex justify-between text-amber-700">
              <span className="font-medium">Overpaid by</span>
              <span className="font-bold">{formatMoney(overpaidCents, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* QuickBooks */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">QuickBooks</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <Checkbox
            checked={isQbo}
            disabled={!canEdit}
            onCheckedChange={(checked) => handleQboChange(checked === true)}
          />
          <span className={!canEdit ? "text-gray-400" : ""}>QuickBooks Invoice</span>
        </label>
      </div>

      {/* Payment Schedule */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Payment Schedule
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading payment schedule...</p>
        ) : (
          <PaymentScheduleTable allocation={allocation} currency={currency} />
        )}
      </div>

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Payment History
          </h3>
          {/* A viewer is not shown a control they could never use. Everyone
              else sees it, enabled on the same terms as every other edit on
              this page — which means a lead AM may record a payment on a quote
              they did not create. */}
          {!isViewer && (
            <button
              onClick={() => setDialogOpen(true)}
              disabled={!canEdit}
              title={
                canEdit
                  ? "Record a check, ACH or manual card payment"
                  : "You can only record a payment on quotes you created."
              }
              className={
                canEdit
                  ? "text-xs font-medium text-darkBlue border border-darkBlue rounded px-2 py-1 hover:bg-blue-50"
                  : "text-xs font-medium text-gray-400 border border-gray-300 rounded px-2 py-1 cursor-not-allowed"
              }
            >
              + Record Payment
            </button>
          )}
        </div>
        {paymentsLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading payments...</p>
        ) : payments.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Amount</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Payer</th>
                <th className="py-2 font-medium">Recorded by</th>
                <th className="py-2 font-medium">Applied To</th>
                <th className="py-2 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{formatDateTime(p.paidAt ?? p.createdAt)}</td>
                  {/* Money out is red with an explicit minus sign — never bare
                      parentheses, which are easy to miss at a glance. */}
                  <td
                    className={`py-2 text-right font-medium ${
                      p.amountCents < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatMoney(p.amountCents, p.currency as Currency)}
                  </td>
                  <td className="py-2 text-gray-500">
                    {paymentMethodLabel(p.paymentMethodType, p.entrySource)}
                    {p.reference && (
                      <span className="block text-xs text-gray-400">{p.reference}</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-500">{p.payerName}</td>
                  <td className="py-2 text-gray-500">
                    {p.entrySource === "stripe"
                      ? "Stripe"
                      : (staffNames.get(p.recordedByUserUuid ?? "") ?? "Staff")}
                  </td>
                  <td className="py-2 text-gray-500">
                    <AppliedTo payment={p} allocation={allocation} currency={currency} />
                  </td>
                  <td className="py-2">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-darkBlue underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center border rounded">
            No payments recorded yet.
          </p>
        )}
        {/* Said once, plainly, because it will be the first question: there is
            no edit or delete on a payment row, on purpose. */}
        <p className="text-xs text-gray-400 mt-2">
          Payments cannot be edited or deleted. To correct one, record a negative amount — both
          entries stay visible.
        </p>
      </div>

      {dialogOpen && (
        <RecordPaymentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          eventId={quote.id}
          currency={currency}
          installments={allocation.installments}
          defaultPayerName={
            [quote.contact?.firstName, quote.contact?.lastName].filter(Boolean).join(" ") || ""
          }
          recordedByUserUuid={perms.userId}
        />
      )}
    </div>
  );
}
