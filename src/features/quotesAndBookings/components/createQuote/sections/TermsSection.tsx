"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";

const termsOptions = [
  { label: "Rental Agreement (Standard)", value: "standard" },
  { label: "Rental Agreement (Custom)", value: "custom" },
];

export function TermsSection() {
  const store = useCreateQuoteStore();

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Terms and Conditions
      </h2>
      <p className="text-sm text-gray-500 mb-2">Rental agreement (Attached document by default)</p>
      <div className="max-w-sm">
        <Dropdown
          options={termsOptions}
          selected={store.termsDocumentId}
          onSelect={(val) => store.setField("termsDocumentId", val)}
          placeholder="Select document..."
        />
      </div>
    </section>
  );
}
