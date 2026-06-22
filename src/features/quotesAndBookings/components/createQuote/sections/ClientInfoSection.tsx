"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { useContacts } from "../../../hooks/useContacts";

export function ClientInfoSection() {
  const contactId = useCreateQuoteStore((s) => s.contactId);
  const useFinanceContact = useCreateQuoteStore((s) => s.useFinanceContact);
  const financeContactId = useCreateQuoteStore((s) => s.financeContactId);
  const setField = useCreateQuoteStore((s) => s.setField);
  const { contacts, isLoading } = useContacts();

  const contactOptions = contacts.map((c) => ({
    label: `${c.firstName} ${c.lastName ?? ""}`.trim() + (c.email ? ` — ${c.email}` : ""),
    value: c.id,
  }));

  const handleContactSelect = (cId: string | null) => {
    setField("contactId", cId);
    if (!cId) return;
    const contact = contacts.find((c) => c.id === cId);
    if (contact) {
      setField("contactName", `${contact.firstName} ${contact.lastName ?? ""}`.trim());
      if (contact.email) setField("companyEmail", contact.email);
      if (contact.phone) setField("phone", contact.phone);
    }
  };

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Client Information
      </h2>
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact <span className="text-red-500">*</span></label>
          <Dropdown
            options={contactOptions}
            selected={contactId}
            onSelect={handleContactSelect}
            placeholder={isLoading ? "Loading contacts..." : "Search contacts..."}
            disabled={isLoading}
          />
        </div>
        <button
          onClick={() => setField("isNewContactModalOpen", true)}
          className="h-[40px] px-4 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm hover:bg-blue-50 transition cursor-pointer whitespace-nowrap"
        >
          + New Contact
        </button>
      </div>

      <div className="mt-3">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useFinanceContact}
            onChange={(e) => {
              setField("useFinanceContact", e.target.checked);
              if (!e.target.checked) {
                setField("financeContactId", null);
                setField("financeContactEmail", "");
              }
            }}
            className="rounded border-gray-300 text-darkBlue focus:ring-darkBlue"
          />
          <span className="text-sm text-gray-700">Different finance contact</span>
        </label>
      </div>

      {useFinanceContact && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Finance Contact</label>
          <Dropdown
            options={contactOptions}
            selected={financeContactId}
            onSelect={(id) => {
              setField("financeContactId", id);
              const fc = contacts.find((c) => c.id === id);
              setField("financeContactEmail", fc?.email ?? "");
            }}
            placeholder={isLoading ? "Loading contacts..." : "Search finance contact..."}
            disabled={isLoading}
          />
        </div>
      )}
    </section>
  );
}
