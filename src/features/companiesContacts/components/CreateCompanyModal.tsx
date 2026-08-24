"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCompany } from "../db/createCompany";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import AddressAutocomplete from "@/components/AddressAutoComplete";
import { AddressFields } from "@/features/quotesAndBookings/types/quoteTypes";
import { useCompaniesAll } from "../hooks/useCompaniesAll";
import { DuplicateWarning } from "./DuplicateWarning";
import { findCompanyContactDuplicates, findCompanyDuplicates } from "../utils/findDuplicates";

const EMPTY_ADDR: AddressFields = { street: "", city: "", stateProvince: "", zipPostal: "" };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Extra classes for the dialog panel — used to raise it above non-Radix overlays. */
  contentClassName?: string;
};

export function CreateCompanyModal({ isOpen, onClose, contentClassName }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [billing, setBilling] = useState<AddressFields>({ ...EMPTY_ADDR });
  const [shipping, setShipping] = useState<AddressFields>({ ...EMPTY_ADDR });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [saving, setSaving] = useState(false);

  const { companies } = useCompaniesAll();
  const labelOf = (c: { companyName: string; email: string | null }) =>
    c.companyName + (c.email ? ` (${c.email})` : "");

  // Email/phone matches hard-block creation; a name-only match is just advisory.
  const blockingCompanies = findCompanyContactDuplicates(companies, { email, phone });
  const blockingLabels = blockingCompanies.map(labelOf);
  const nameOnlyLabels = findCompanyDuplicates(companies, { companyName, email: "", phone: "" })
    .filter((c) => !blockingCompanies.some((b) => b.id === c.id))
    .map(labelOf);

  const reset = () => {
    setCompanyName(""); setEmail(""); setPhone(""); setNotes("");
    setBilling({ ...EMPTY_ADDR }); setShipping({ ...EMPTY_ADDR });
    setSameAsBilling(true);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createCompany({ companyName, phone, email, notes, billingAddress: billing, shippingAddress: sameAsBilling ? billing : shipping, shippingSameAsBilling: sameAsBilling });
      createSuccessToast([`Company "${companyName}" created.`]);
      handleClose();
    } catch { /* error shown by createCompany */ } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={`sm:max-w-md max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-xl ${contentClassName ?? ""}`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">New Company</DialogTitle>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company Name *</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Live Nation Entertainment"
              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.com"
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (310) 867-7000"
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
            </div>
          </div>

          <DuplicateWarning matches={blockingLabels} kind="company" severity="block" />
          <DuplicateWarning matches={nameOnlyLabels} kind="company" severity="warn" />

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Billing Address</p>
            <AddressAutocomplete
              initialValue={billing.street}
              onAddressSelect={(d) => setBilling({ street: d.address ?? "", city: d.city ?? "", stateProvince: d.state ?? "", zipPostal: d.postalCode ?? "" })}
              className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
            />
            {billing.city && (
              <p className="text-xs text-gray-400 mt-1">
                {billing.city}{billing.stateProvince ? `, ${billing.stateProvince}` : ""}{billing.zipPostal ? ` ${billing.zipPostal}` : ""}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="rounded" />
            Shipping same as billing
          </label>

          {!sameAsBilling && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Shipping Address</p>
              <AddressAutocomplete
                initialValue={shipping.street}
                onAddressSelect={(d) => setShipping({ street: d.address ?? "", city: d.city ?? "", stateProvince: d.state ?? "", zipPostal: d.postalCode ?? "" })}
                className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors"
              />
              {shipping.city && (
                <p className="text-xs text-gray-400 mt-1">
                  {shipping.city}{shipping.stateProvince ? `, ${shipping.stateProvince}` : ""}{shipping.zipPostal ? ` ${shipping.zipPostal}` : ""}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="VIP client..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-colors" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button onClick={handleClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!companyName.trim() || saving || blockingCompanies.length > 0}
            className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer disabled:opacity-40">
            {saving ? "Saving…" : "Save Company"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
