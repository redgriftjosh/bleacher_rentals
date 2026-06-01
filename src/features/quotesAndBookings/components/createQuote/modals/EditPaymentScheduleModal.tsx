"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { PaymentInstallment } from "../../../types/quoteTypes";
import { formatCurrency, currencySymbol } from "../../../utils/formatCurrency";
import { DEFAULT_TAX_RATE } from "../../../data/mockData";

type DraftRow = PaymentInstallment & {
  /** Display string for the % input — kept separate so typing "33.3" doesn't jump. */
  pctDisplay: string;
  /** Display string for the $ input. */
  dollarDisplay: string;
};

export function EditPaymentScheduleModal() {
  const isOpen = useCreateQuoteStore((s) => s.isEditPaymentScheduleModalOpen);
  const storeInstallments = useCreateQuoteStore((s) => s.paymentInstallments);
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const currency = useCreateQuoteStore((s) => s.currency);
  const setField = useCreateQuoteStore((s) => s.setField);
  const setPaymentInstallments = useCreateQuoteStore((s) => s.setPaymentInstallments);

  const [draft, setDraft] = useState<DraftRow[]>([]);

  const total = useMemo(() => {
    const subtotal = lineItems
      .filter((i) => i.category !== "discounts")
      .reduce((sum, i) => sum + i.lineTotal, 0);
    const discountTotal = lineItems
      .filter((i) => i.category === "discounts")
      .reduce((sum, i) => sum + i.lineTotal, 0);
    const taxableAmount = subtotal + discountTotal;
    const taxAmount = taxableAmount * (DEFAULT_TAX_RATE / 100);
    return taxableAmount + taxAmount;
  }, [lineItems]);

  const totalCents = Math.round(total * 100);

  const centsToPct = useCallback(
    (cents: number) => (totalCents > 0 ? ((cents / totalCents) * 100).toFixed(2) : "0"),
    [totalCents],
  );

  const pctToCents = useCallback(
    (pct: number) => Math.round((pct / 100) * totalCents),
    [totalCents],
  );

  // Seed draft when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (storeInstallments.length > 0) {
      setDraft(
        storeInstallments.map((i) => ({
          ...i,
          pctDisplay: centsToPct(i.amountCents),
          dollarDisplay: (i.amountCents / 100).toFixed(2),
        })),
      );
    } else {
      setDraft([
        {
          id: crypto.randomUUID(),
          dueDate: new Date().toISOString().split("T")[0],
          amountCents: totalCents,
          status: "unpaid",
          pctDisplay: "100",
          dollarDisplay: (totalCents / 100).toFixed(2),
        },
      ]);
    }
  }, [isOpen, storeInstallments, totalCents, centsToPct]);

  const scheduledCents = draft.reduce((sum, i) => sum + i.amountCents, 0);
  const remaining = totalCents - scheduledCents;
  const isBalanced = remaining === 0;

  const close = () => setField("isEditPaymentScheduleModalOpen", false);

  const handleAdd = () => {
    const remainCents = Math.max(remaining, 0);
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        dueDate: "",
        amountCents: remainCents,
        status: "unpaid" as const,
        pctDisplay: centsToPct(remainCents),
        dollarDisplay: (remainCents / 100).toFixed(2),
      },
    ]);
  };

  const handleRemove = (id: string) => {
    setDraft((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDateChange = (id: string, value: string) => {
    setDraft((prev) => prev.map((i) => (i.id === id ? { ...i, dueDate: value } : i)));
  };

  /** User edited the % field → recompute dollar + cents. */
  const handlePctChange = (id: string, raw: string) => {
    setDraft((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const pct = parseFloat(raw || "0");
        const cents = pctToCents(pct);
        return {
          ...i,
          pctDisplay: raw,
          amountCents: cents,
          dollarDisplay: (cents / 100).toFixed(2),
        };
      }),
    );
  };

  /** User edited the $ field → recompute % + cents. */
  const handleDollarChange = (id: string, raw: string) => {
    setDraft((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const dollars = parseFloat(raw || "0");
        const cents = Math.round(dollars * 100);
        return {
          ...i,
          dollarDisplay: raw,
          amountCents: cents,
          pctDisplay: centsToPct(cents),
        };
      }),
    );
  };

  const handleSplitEvenly = () => {
    if (draft.length === 0) return;
    const per = Math.floor(totalCents / draft.length);
    const rem = totalCents - per * draft.length;
    setDraft((prev) =>
      prev.map((inst, idx) => {
        const cents = per + (idx === 0 ? rem : 0);
        return {
          ...inst,
          amountCents: cents,
          pctDisplay: centsToPct(cents),
          dollarDisplay: (cents / 100).toFixed(2),
        };
      }),
    );
  };

  const handleSave = () => {
    setPaymentInstallments(
      draft.map(({ pctDisplay, dollarDisplay, ...rest }) => rest),
    );
    close();
  };

  const sym = currencySymbol(currency);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Payment Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total reference */}
          <div className="flex justify-between text-sm bg-gray-50 rounded px-3 py-2">
            <span className="text-gray-500">Quote Total</span>
            <span className="font-bold">{formatCurrency(totalCents / 100, currency)}</span>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide px-1">
            <span className="w-5 shrink-0" />
            <span className="flex-1">Due Date</span>
            <span className="w-24 text-right">%</span>
            <span className="w-28 text-right">Amount</span>
            <span className="w-6" />
          </div>

          {/* Installment rows */}
          <div className="space-y-2">
            {draft.map((inst, idx) => (
              <div key={inst.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5 shrink-0">#{idx + 1}</span>

                {/* Date */}
                <input
                  type="date"
                  value={inst.dueDate}
                  onChange={(e) => handleDateChange(inst.id, e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-greenAccent flex-1"
                />

                {/* Percentage */}
                <div className="relative w-24">
                  <input
                    type="number"
                    value={inst.pctDisplay}
                    onChange={(e) => handlePctChange(inst.id, e.target.value)}
                    min="0"
                    max="100"
                    step="1"
                    className="w-full rounded border border-gray-300 pl-2 pr-6 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-greenAccent"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    %
                  </span>
                </div>

                {/* Dollar amount */}
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {sym}
                  </span>
                  <input
                    type="number"
                    value={inst.dollarDisplay}
                    onChange={(e) => handleDollarChange(inst.id, e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-gray-300 pl-6 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-greenAccent"
                  />
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleRemove(inst.id)}
                  disabled={draft.length <= 1}
                  className="p-1 text-gray-400 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add Installment
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={handleSplitEvenly}
              disabled={draft.length === 0}
              className="text-xs text-blue-600 hover:text-blue-800 transition cursor-pointer disabled:opacity-30"
            >
              Split Evenly
            </button>
          </div>

          {/* Remaining balance */}
          <div
            className={`flex justify-between text-sm rounded px-3 py-2 ${
              isBalanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            <span>Remaining</span>
            <span className="font-semibold">{formatCurrency(remaining / 100, currency)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isBalanced}>
            {isBalanced ? "Save Schedule" : "Amounts must equal total"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
