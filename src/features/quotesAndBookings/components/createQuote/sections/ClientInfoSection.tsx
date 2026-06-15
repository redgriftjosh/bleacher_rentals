"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { useContacts } from "../../../hooks/useContacts";

export function ClientInfoSection() {
  const contactId = useCreateQuoteStore((s) => s.contactId);
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
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
    </section>
  );
}
