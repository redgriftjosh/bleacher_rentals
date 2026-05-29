"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";

export function ClientInfoSection() {
  const store = useCreateQuoteStore();

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Client Information
      </h2>
      <div className="flex items-end gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search contacts...</label>
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <button
          onClick={() => store.setField("isNewContactModalOpen", true)}
          className="h-[40px] px-4 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm hover:bg-blue-50 transition cursor-pointer whitespace-nowrap"
        >
          + New Contact
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            type="text"
            value={store.companyName}
            disabled
            placeholder="Auto-filled from contact"
            className="w-full h-[40px] px-3 border rounded text-sm bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
          <input
            type="email"
            value={store.companyEmail}
            disabled
            placeholder="client@company.com"
            className="w-full h-[40px] px-3 border rounded text-sm bg-gray-50 text-gray-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          value={store.phone}
          disabled
          placeholder="+1 (555) 123-4567"
          className="w-full h-[40px] px-3 border rounded text-sm bg-gray-50 text-gray-500 max-w-xs"
        />
      </div>
    </section>
  );
}
