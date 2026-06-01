"use client";

import { useEffect, useState, useCallback } from "react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { fetchContacts, ContactOption } from "../../../db/fetchContacts";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export function ClientInfoSection() {
  const store = useCreateQuoteStore();
  const supabase = useClerkSupabaseClient();
  const isContactModalOpen = useCreateQuoteStore((s) => s.isNewContactModalOpen);

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(() => {
    setLoading(true);
    fetchContacts(supabase)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [supabase]);

  // Fetch on mount
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Refetch when NewContactModal closes (new contact was created)
  useEffect(() => {
    if (isContactModalOpen) return;
    loadContacts();
  }, [isContactModalOpen, loadContacts]);

  const contactOptions = contacts.map((c) => ({
    label: `${c.firstName} ${c.lastName ?? ""}`.trim() + (c.email ? ` — ${c.email}` : ""),
    value: c.id,
  }));

  const handleContactSelect = (contactId: string | null) => {
    store.setField("contactId", contactId);
    if (!contactId) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      store.setField("contactName", `${contact.firstName} ${contact.lastName ?? ""}`.trim());
      if (contact.email) store.setField("companyEmail", contact.email);
      if (contact.phone) store.setField("phone", contact.phone);
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
            selected={store.contactId}
            onSelect={handleContactSelect}
            placeholder={loading ? "Loading contacts..." : "Search contacts..."}
            disabled={loading}
          />
        </div>
        <button
          onClick={() => store.setField("isNewContactModalOpen", true)}
          className="h-[40px] px-4 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm hover:bg-blue-50 transition cursor-pointer whitespace-nowrap"
        >
          + New Contact
        </button>
      </div>
    </section>
  );
}
