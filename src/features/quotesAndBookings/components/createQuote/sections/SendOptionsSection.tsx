"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";

export function SendOptionsSection() {
  const attachPdfViaEmail = useCreateQuoteStore((s) => s.attachPdfViaEmail);
  const setField = useCreateQuoteStore((s) => s.setField);

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Send Options
      </h2>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={attachPdfViaEmail}
          onChange={(e) => setField("attachPdfViaEmail", e.target.checked)}
          className="rounded"
        />
        Attach as PDF via Email
      </label>
    </section>
  );
}
