"use client";

import {
  CreateContactModal,
  type CreatedContact,
} from "@/features/companiesContacts/components/CreateContactModal";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";

/**
 * Quote-form binding for the shared New Contact modal (the same one used by
 * /companies-contacts and the work tracker). It only wires the store up — the form,
 * its validation and duplicate checks live in the shared component.
 */
export function NewContactModal() {
  const isOpen = useCreateQuoteStore((s) => s.isNewContactModalOpen);
  const setField = useCreateQuoteStore((s) => s.setField);

  const applyToQuote = (contact: CreatedContact) => {
    setField("contactId", contact.id);
    setField("contactName", contact.displayName);
    setField("companyEmail", contact.email);
    setField("phone", contact.phone);
    if (contact.companyName) setField("companyName", contact.companyName);
  };

  return (
    <CreateContactModal
      isOpen={isOpen}
      onClose={() => setField("isNewContactModalOpen", false)}
      onCreated={applyToQuote}
    />
  );
}
