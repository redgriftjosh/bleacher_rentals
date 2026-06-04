"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { PaymentMethod } from "../../../types/quoteTypes";
import { PAYMENT_METHOD_LABELS } from "../../../data/mockData";

const paymentOptions = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[])
  .filter((k): k is NonNullable<PaymentMethod> => k !== null)
  .map((key) => ({
    label: PAYMENT_METHOD_LABELS[key],
    value: key,
  }));

export function PaymentInfoSection() {
  const store = useCreateQuoteStore();

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Payment Info
      </h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
        <div className="max-w-xs">
          <Dropdown
            options={paymentOptions}
            selected={store.paymentMethod}
            onSelect={(val) => store.setField("paymentMethod", val)}
            placeholder="Select method..."
          />
        </div>
      </div>
    </section>
  );
}
