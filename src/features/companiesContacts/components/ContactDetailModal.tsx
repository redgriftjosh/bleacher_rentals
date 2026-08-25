"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dropdown } from "@/components/DropDown";
import { FIELD_LABEL, TextAreaField, TextField } from "@/components/form/TextField";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { useTouchedErrors } from "@/lib/validation/useTouchedErrors";
import { updateContact } from "../db/updateContact";
import { softDeleteContact } from "../db/softDeleteContact";
import { useCompaniesAll } from "../hooks/useCompaniesAll";
import type { ContactFull } from "../hooks/useContactsAll";
import { DetailField } from "./DetailField";
import { hasErrors, validateContactForm, type ContactFormValues } from "../utils/formValidation";

const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone"] as const;

const EMPTY_VALUES: ContactFormValues = { firstName: "", lastName: "", email: "", phone: "" };

type Props = {
  contact: ContactFull | null;
  onClose: () => void;
};

export function ContactDetailModal({ contact, onClose }: Props) {
  const { companies, isLoading: loadingCompanies } = useCompaniesAll();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [values, setValues] = useState<ContactFormValues>(EMPTY_VALUES);
  const [notes, setNotes] = useState("");
  const [companyUuid, setCompanyUuid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const errors = validateContactForm(values);
  const { errorFor, markTouched, markAllTouched, reset: resetTouched } = useTouchedErrors(errors);

  const setValue = (key: keyof ContactFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!contact) return;
    setValues({
      firstName: contact.firstName,
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });
    setNotes(contact.notes ?? "");
    setCompanyUuid(contact.companyUuid);
    setMode("view");
    resetTouched();
  }, [contact, resetTouched]);

  const handleClose = () => {
    setMode("view");
    onClose();
  };

  const canSave = !!contact && !hasErrors(errors) && !saving;

  const handleSave = async () => {
    markAllTouched(CONTACT_FIELDS);
    if (!contact || !canSave) return;

    setSaving(true);
    try {
      await updateContact(contact.id, { ...values, notes, companyUuid });
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
              <DetailField label="Email" value={contact?.email} />
              <DetailField label="Phone" value={contact?.phone} />
              <DetailField label="Company" value={displayCompany} />
              <DetailField label="Notes" value={contact?.notes} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="First Name"
                  required
                  value={values.firstName}
                  onChange={setValue("firstName")}
                  onBlur={() => markTouched("firstName")}
                  error={errorFor("firstName")}
                />
                <TextField
                  label="Last Name"
                  value={values.lastName}
                  onChange={setValue("lastName")}
                  onBlur={() => markTouched("lastName")}
                  error={errorFor("lastName")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={setValue("email")}
                  onBlur={() => markTouched("email")}
                  error={errorFor("email")}
                />
                <TextField
                  label="Phone"
                  type="tel"
                  value={values.phone}
                  onChange={setValue("phone")}
                  onBlur={() => markTouched("phone")}
                  error={errorFor("phone")}
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Company</label>
                <Dropdown
                  options={companyOptions}
                  selected={companyUuid}
                  onSelect={setCompanyUuid}
                  placeholder={loadingCompanies ? "Loading..." : "Select company..."}
                  disabled={loadingCompanies}
                />
              </div>
              <TextAreaField label="Notes" value={notes} onChange={setNotes} />
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
                  disabled={!canSave}
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
