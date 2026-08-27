"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextAreaField, TextField } from "@/components/form/TextField";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { useTouchedErrors } from "@/lib/validation/useTouchedErrors";
import { updateCompany } from "../db/updateCompany";
import { softDeleteCompany } from "../db/softDeleteCompany";
import { useContactsByCompany } from "../hooks/useContactsByCompany";
import type { CompanyFull } from "../hooks/useCompaniesAll";
import { DetailField } from "./DetailField";
import { hasErrors, validateCompanyForm, type CompanyFormValues } from "../utils/formValidation";

const COMPANY_FIELDS = ["companyName", "email", "phone"] as const;

const EMPTY_VALUES: CompanyFormValues = { companyName: "", email: "", phone: "" };

type Props = {
  company: CompanyFull | null;
  onClose: () => void;
};

export function CompanyDetailModal({ company, onClose }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [values, setValues] = useState<CompanyFormValues>(EMPTY_VALUES);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const linkedContacts = useContactsByCompany(company?.id ?? null);

  const errors = validateCompanyForm(values);
  const { errorFor, markTouched, markAllTouched, reset: resetTouched } = useTouchedErrors(errors);

  const setValue = (key: keyof CompanyFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!company) return;
    setValues({
      companyName: company.companyName,
      email: company.email ?? "",
      phone: company.phone ?? "",
    });
    setNotes(company.notes ?? "");
    setMode("view");
    resetTouched();
  }, [company, resetTouched]);

  const handleClose = () => {
    setMode("view");
    onClose();
  };

  const canSave = !!company && !hasErrors(errors) && !saving;

  const handleSave = async () => {
    markAllTouched(COMPANY_FIELDS);
    if (!company || !canSave) return;

    setSaving(true);
    try {
      await updateCompany(company.id, { ...values, notes });
      createSuccessToast(["Company updated."]);
      setMode("view");
    } catch {
      /* error shown by updateCompany */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    if (!confirm(`Delete company "${company.companyName}"? Linked contacts will not be deleted.`))
      return;
    setDeleting(true);
    try {
      await softDeleteCompany(company.id);
      createSuccessToast(["Company deleted."]);
      handleClose();
    } catch {
      /* error shown */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!company} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              {mode === "view" ? (company?.companyName ?? "") : "Edit Company"}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {mode === "view" ? (
            <div className="space-y-1">
              <DetailField label="Email" value={company?.email} />
              <DetailField label="Phone" value={company?.phone} />
              <DetailField label="Notes" value={company?.notes} />

              <div className="pt-3 mt-3 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Contacts ({linkedContacts.length})
                </p>
                {linkedContacts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-1">No contacts linked.</p>
                ) : (
                  <div className="rounded-lg border border-gray-100 overflow-hidden">
                    {linkedContacts.map((c, i) => (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between px-3 py-2 text-sm ${i !== 0 ? "border-t border-gray-50" : ""}`}
                      >
                        <span className="font-medium text-gray-800">
                          {c.firstName} {c.lastName ?? ""}
                        </span>
                        <span className="text-gray-400 text-xs">{c.email ?? c.phone ?? ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <TextField
                label="Company Name"
                required
                value={values.companyName}
                onChange={setValue("companyName")}
                onBlur={() => markTouched("companyName")}
                error={errorFor("companyName")}
              />
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
