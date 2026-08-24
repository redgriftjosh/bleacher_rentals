"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CreateContactModal } from "@/features/companiesContacts/components/CreateContactModal";
import { useContactsAll } from "@/features/companiesContacts/hooks/useContactsAll";
import {
  buildPocContactOptions,
  contactDisplayName,
  resolvePocTriggerLabel,
  type PocValue,
} from "../util/pocField";

type PocSelectProps = {
  contactUuid: string | null;
  /** Denormalised text kept alongside the link; also holds legacy free text. */
  pocText: string | null;
  onChange: (next: PocValue) => void;
  placeholder: string;
  disabled?: boolean;
};

/**
 * Contact picker for the Pickup / Dropoff POC fields.
 *
 * Writes the uuid and the display text together so the invariant the PDF and Bill of Lading
 * rely on holds: whenever a contact is linked, the text column names that contact.
 */
export function PocSelect({
  contactUuid,
  pocText,
  onChange,
  placeholder,
  disabled = false,
}: PocSelectProps) {
  const { contacts, isLoading } = useContactsAll();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const select = (id: string | null) => {
    if (!id) {
      onChange({ contactUuid: null, pocText: null });
      return;
    }

    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;

    onChange({ contactUuid: contact.id, pocText: contactDisplayName(contact) });
  };

  return (
    <>
      <SearchableSelect
        options={buildPocContactOptions(contacts)}
        selected={contactUuid}
        onSelect={select}
        fallbackLabel={resolvePocTriggerLabel(contactUuid, pocText, contacts)}
        placeholder={isLoading ? "Loading contacts..." : placeholder}
        searchPlaceholder="Search by name, email or company..."
        emptyMessage="No contacts found."
        disabled={disabled || isLoading}
        footerItem={{ label: "+ Add new contact", onSelect: () => setIsCreateOpen(true) }}
      />

      <CreateContactModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(contact) => onChange({ contactUuid: contact.id, pocText: contact.displayName })}
        // WorkTrackerModal is not a Radix dialog: it paints its own z-[2000] overlay, so this
        // portal has to be raised past it. Matches the z-[2101] its save-confirm dialog uses.
        contentClassName="z-[2101]"
      />
    </>
  );
}
