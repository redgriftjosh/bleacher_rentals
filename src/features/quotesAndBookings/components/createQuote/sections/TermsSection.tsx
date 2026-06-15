"use client";

import { useMemo } from "react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { useTermsAndConditions } from "@/features/termsAndConditions/hooks/useTermsAndConditions";

export function TermsSection() {
  const termsDocumentId = useCreateQuoteStore((s) => s.termsDocumentId);
  const setField = useCreateQuoteStore((s) => s.setField);
  const { items, isLoading } = useTermsAndConditions();

  const options = useMemo(
    () => items.map((t) => ({ label: t.name, value: t.id })),
    [items],
  );

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Terms and Conditions
      </h2>
      <p className="text-sm text-gray-500 mb-2">
        Select a contract template to attach to this quote
      </p>
      <div className="max-w-sm">
        <Dropdown
          options={options}
          selected={termsDocumentId}
          onSelect={(val) => setField("termsDocumentId", val)}
          placeholder={isLoading ? "Loading..." : "Select contract template..."}
          disabled={isLoading}
        />
      </div>
    </section>
  );
}
