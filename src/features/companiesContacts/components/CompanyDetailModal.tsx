"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { updateCompany } from "../db/updateCompany";
import { softDeleteCompany } from "../db/softDeleteCompany";
import { useContactsByCompany } from "../hooks/useContactsByCompany";
import type { CompanyFull } from "../hooks/useCompaniesAll";

type Props = {
  company: CompanyFull | null;
  onClose: () => void;
};

export function CompanyDetailModal({ company, onClose }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const linkedContacts = useContactsByCompany(company?.id ?? null);

  useEffect(() => {
    if (company) {
      setCompanyName(company.companyName);
      setEmail(company.email ?? "");
      setPhone(company.phone ?? "");
      setNotes(company.notes ?? "");
      setMode("view");
    }
  }, [company]);

  const handleClose = () => { setMode("view"); onClose(); };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await updateCompany(company.id, { companyName, email, phone, notes });
      createSuccessToast(["Company updated."]);
      setMode("view");
    } catch { /* error shown by updateCompany */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!company) return;
    if (!confirm(`Delete company "${company.companyName}"? Linked contacts will not be deleted.`)) return;
    setDeleting(true);
    try {
      await softDeleteCompany(company.id);
      createSuccessToast(["Company deleted."]);
      handleClose();
    } catch { /* error shown */ } finally { setDeleting(false); }
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
              <Field label="Email" value={company?.email} />
              <Field label="Phone" value={company?.phone} />
              <Field label="Notes" value={company?.notes} />

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
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company Name *</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button onClick={handleDelete} disabled={deleting}
            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-40 cursor-pointer">
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <div className="flex items-center gap-2">
            {mode === "view" ? (
              <>
                <button onClick={handleClose}
                  className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
                  Close
                </button>
                <button onClick={() => setMode("edit")}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer">
                  Edit
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setMode("view")}
                  className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!companyName.trim() || saving}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer disabled:opacity-40">
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
      <span className="w-20 flex-shrink-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}
