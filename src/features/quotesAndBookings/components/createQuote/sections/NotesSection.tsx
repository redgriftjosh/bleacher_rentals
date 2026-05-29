"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";

export function NotesSection() {
  const store = useCreateQuoteStore();

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Notes
      </h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client-Facing Notes
        </label>
        <textarea
          value={store.clientFacingNotes}
          onChange={(e) => store.setField("clientFacingNotes", e.target.value)}
          placeholder="Visible to client..."
          rows={3}
          className="w-full px-3 py-2 border rounded text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Internal Notes (not visible to client)
        </label>
        <textarea
          value={store.internalNotes}
          onChange={(e) => store.setField("internalNotes", e.target.value)}
          placeholder="Internal team notes..."
          rows={3}
          className="w-full px-3 py-2 border rounded text-sm resize-none"
        />
      </div>
    </section>
  );
}
