"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { formatCurrency } from "../../../utils/formatCurrency";
import { calculateTotals } from "../../../utils/calculateTotals";

function EditableCentsRow({
  label,
  cents,
  onSave,
  currency,
  className,
}: {
  label: string;
  cents: number;
  onSave: (newCents: number) => void;
  currency: "USD" | "CAD";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft((cents / 100).toFixed(2));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      onSave(Math.round(parsed * 100));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={`flex justify-between text-sm ${className ?? ""}`}>
        <span className="font-medium">{label}</span>
        <input
          type="number"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          autoFocus
          className="w-28 text-right border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <div className={`flex justify-between text-sm group ${className ?? ""}`}>
      <span className="font-medium flex items-center gap-1">
        {label}
        <button
          onClick={startEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Override value"
        >
          <Pencil className="w-3 h-3 text-gray-400" />
        </button>
      </span>
      <span className="font-semibold">{formatCurrency(cents / 100, currency)}</span>
    </div>
  );
}

export function TotalsDisplay() {
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const currency = useCreateQuoteStore((s) => s.currency);
  const taxPercent = useCreateQuoteStore((s) => s.taxPercent);
  const taxLoading = useCreateQuoteStore((s) => s.taxLoading);
  const taxOverrideCents = useCreateQuoteStore((s) => s.taxOverrideCents);
  const setField = useCreateQuoteStore((s) => s.setField);

  const { subtotal, discountTotal, taxAmount, total } = useMemo(
    () => calculateTotals(lineItems, taxPercent),
    [lineItems, taxPercent],
  );

  const effectiveTaxCents = taxOverrideCents ?? taxAmount;
  const taxableAmount = subtotal + discountTotal;
  const effectiveTotal = taxableAmount + effectiveTaxCents;

  const taxLabel = taxPercent !== null
    ? `Tax (${taxPercent.toFixed(2)}%)${taxOverrideCents !== null ? " — overridden" : ""}`
    : "Tax";

  return (
    <div className="flex justify-end">
      <div className="space-y-2 w-72">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Subtotal:</span>
          <span className="font-semibold">{formatCurrency(subtotal / 100, currency)}</span>
        </div>
        {discountTotal !== 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span className="font-medium">Discounts:</span>
            <span className="font-semibold">{formatCurrency(discountTotal / 100, currency)}</span>
          </div>
        )}
        <EditableCentsRow
          label={taxLabel}
          cents={effectiveTaxCents}
          currency={currency}
          onSave={(newCents) => setField("taxOverrideCents", newCents)}
        />
        {taxPercent === null && !taxOverrideCents && (
          <div className="flex justify-between text-sm">
            <span />
            <span className="text-gray-400 text-xs">Select office & address</span>
          </div>
        )}
        {taxLoading && (
          <div className="flex justify-end">
            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          </div>
        )}
        <div className="flex justify-between text-base border-t pt-2 mt-1">
          <span className="font-bold">TOTAL</span>
          <span className="font-bold">{formatCurrency(effectiveTotal / 100, currency)}</span>
        </div>
      </div>
    </div>
  );
}
