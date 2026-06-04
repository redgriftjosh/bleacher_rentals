"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { createContact } from "../../../db/createContact";
import { useCompanies } from "../../../hooks/useCompanies";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

export function NewContactModal() {
  const isOpen = useCreateQuoteStore((s) => s.isNewContactModalOpen);
  const setField = useCreateQuoteStore((s) => s.setField);
  const supabase = useClerkSupabaseClient();

  // Reactive — auto-updates when PowerSync syncs new companies
  const { companies, isLoading: loadingCompanies } = useCompanies();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyUuid, setCompanyUuid] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const companyOptions = companies.map((c) => ({
    label: c.companyName,
    value: c.id,
  }));

  const selectedCompanyName = companies.find((c) => c.id === companyUuid)?.companyName ?? "";

  const resetAndClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompanyUuid(null);
    setNotes("");
    setField("isNewContactModalOpen", false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createContact(
        { firstName, lastName, phone, email, notes, companyUuid },
        supabase,
      );

      setField("contactName", `${firstName} ${lastName}`.trim());
      setField("companyEmail", email);
      setField("phone", phone);
      if (selectedCompanyName) {
        setField("companyName", selectedCompanyName);
      }
      createSuccessToast([`Contact "${firstName} ${lastName}" created.`]);
      resetAndClose();
    } catch {
      // Error toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Dropdown
                  options={companyOptions}
                  selected={companyUuid}
                  onSelect={setCompanyUuid}
                  placeholder={loadingCompanies ? "Loading..." : "Select company..."}
                  disabled={loadingCompanies}
                />
              </div>
              <button
                onClick={() => setField("isNewCompanyModalOpen", true)}
                className="h-[40px] px-3 text-sm font-medium text-darkBlue border border-darkBlue rounded-sm hover:bg-blue-50 transition cursor-pointer whitespace-nowrap"
              >
                + New Company
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about contact..."
              rows={3}
              className="w-full px-3 py-2 border rounded text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!firstName.trim() || saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Contact"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
