"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useCompaniesAll } from "../hooks/useCompaniesAll";
import { useContactsAll } from "../hooks/useContactsAll";
import { createContact } from "../db/createContact";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { DuplicateWarning } from "./DuplicateWarning";
import { findContactDuplicates } from "../utils/findDuplicates";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Fires after a successful insert, before onClose. Carries the display name as well as the
   * id: a caller that wants to select the new contact cannot yet find it in a reactive query,
   * which has not re-emitted at this point.
   */
  onCreated?: (contact: { id: string; displayName: string }) => void;
  /**
   * Extra classes for the dialog panel. Needed when opening from a surface that is not a Radix
   * dialog — WorkTrackerModal paints its own overlay at z-[2000], well above the z-50 this
   * portal defaults to, so the panel needs raising or it renders underneath.
   */
  contentClassName?: string;
};

export function CreateContactModal({
  isOpen,
  onClose,
  onCreated,
  contentClassName,
}: Props) {
  const { companies, isLoading } = useCompaniesAll();
  const { contacts } = useContactsAll();
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyUuid, setCompanyUuid] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setCompanyUuid(null); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const contactId = await createContact({
        firstName, lastName, phone, email, notes, companyUuid,
      });
      createSuccessToast([`Contact "${`${firstName} ${lastName}`.trim()}" created.`]);
      onCreated?.({ id: contactId, displayName: `${firstName} ${lastName}`.trim() });
      handleClose();
    } catch { /* error shown by createContact */ } finally { setSaving(false); }
  };

  const companyOptions = companies.map((c) => ({
    label: c.companyName,
    value: c.id,
    searchValue: `${c.email ?? ""} ${c.phone ?? ""} ${c.address}`,
  }));

  const duplicateContacts = findContactDuplicates(contacts, { email, phone });
  const duplicateLabels = duplicateContacts.map((c) =>
    `${c.firstName} ${c.lastName ?? ""}`.trim() + (c.email ? ` (${c.email})` : ""),
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className={`sm:max-w-md p-0 gap-0 rounded-xl ${contentClassName ?? ""}`}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-gray-900">New Contact</DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">First Name *</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
              </div>
            </div>

            <DuplicateWarning matches={duplicateLabels} kind="contact" severity="block" />

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={companyOptions}
                    selected={companyUuid}
                    onSelect={setCompanyUuid}
                    placeholder={isLoading ? "Loading..." : "Select company..."}
                    searchPlaceholder="Search by name, email, phone or address..."
                    emptyMessage="No companies found."
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={() => setCreateCompanyOpen(true)}
                  className="h-9 px-3 text-sm font-medium text-darkBlue border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap bg-gray-50"
                >
                  + New
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
            <button onClick={handleClose}
              className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!firstName.trim() || saving || duplicateContacts.length > 0}
              className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer disabled:opacity-40">
              {saving ? "Saving…" : "Save Contact"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateCompanyModal
        isOpen={createCompanyOpen}
        onClose={() => setCreateCompanyOpen(false)}
        contentClassName={contentClassName ? "z-[2102]" : undefined}
      />
    </>
  );
}
