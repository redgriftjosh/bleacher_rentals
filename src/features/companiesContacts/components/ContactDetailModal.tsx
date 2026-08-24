"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dropdown } from "@/components/DropDown";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { updateContact } from "../db/updateContact";
import { softDeleteContact } from "../db/softDeleteContact";
import { useCompaniesAll } from "../hooks/useCompaniesAll";
import type { ContactFull } from "../hooks/useContactsAll";
import { PREFERRED_LANGUAGE_OPTIONS, type PreferredLanguage } from "../db/preferredLanguage";

type Props = {
  contact: ContactFull | null;
  onClose: () => void;
};

export function ContactDetailModal({ contact, onClose }: Props) {
  const { companies, isLoading: loadingCompanies } = useCompaniesAll();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [companyUuid, setCompanyUuid] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>("english");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName);
      setLastName(contact.lastName ?? "");
      setEmail(contact.email ?? "");
      setPhone(contact.phone ?? "");
      setNotes(contact.notes ?? "");
      setCompanyUuid(contact.companyUuid);
      setPreferredLanguage(contact.preferredLanguage);
      setMode("view");
    }
  }, [contact]);

  const handleClose = () => {
    setMode("view");
    onClose();
  };

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await updateContact(contact.id, {
        firstName,
        lastName,
        email,
        phone,
        notes,
        companyUuid,
        preferredLanguage,
      });
      createSuccessToast(["Contact updated."]);
      setMode("view");
    } catch {
      /* error shown by updateContact */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    if (!confirm(`Delete contact "${contact.firstName} ${contact.lastName ?? ""}"?`)) return;
    setDeleting(true);
    try {
      await softDeleteContact(contact.id);
      createSuccessToast(["Contact deleted."]);
      handleClose();
    } catch {
      /* error shown */
    } finally {
      setDeleting(false);
    }
  };

  const companyOptions = companies.map((c) => ({ label: c.companyName, value: c.id }));
  // Quotes for this contact render in this language — see docs/specs/quote-preferred-language.md.
  const languageLabel = PREFERRED_LANGUAGE_OPTIONS.find(
    (o) => o.value === contact?.preferredLanguage,
  )?.label;
  const displayCompany =
    contact?.companyName ?? companies.find((c) => c.id === companyUuid)?.companyName;

  return (
    <Dialog open={!!contact} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              {mode === "view"
                ? `${contact?.firstName ?? ""} ${contact?.lastName ?? ""}`.trim()
                : "Edit Contact"}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {mode === "view" ? (
            <div className="space-y-1">
              <Field label="Email" value={contact?.email} />
              <Field label="Phone" value={contact?.phone} />
              <Field label="Company" value={displayCompany} />
              <Field label="Language" value={languageLabel} />
              <Field label="Notes" value={contact?.notes} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Company
                </label>
                <Dropdown
                  options={companyOptions}
                  selected={companyUuid}
                  onSelect={setCompanyUuid}
                  placeholder={loadingCompanies ? "Loading..." : "Select company..."}
                  disabled={loadingCompanies}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Quote Language
                </label>
                <Dropdown
                  options={PREFERRED_LANGUAGE_OPTIONS}
                  selected={preferredLanguage}
                  onSelect={(v) => setPreferredLanguage(v as PreferredLanguage)}
                  placeholder="Select language..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <div className="flex items-center gap-2">
            {mode === "view" ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => setMode("edit")}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMode("view")}
                  className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!firstName.trim() || saving}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0">
      <span className="w-20 flex-shrink-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800">
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}
