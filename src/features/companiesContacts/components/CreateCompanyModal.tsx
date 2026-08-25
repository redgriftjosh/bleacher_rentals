"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextAreaField, TextField } from "@/components/form/TextField";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { useTouchedErrors } from "@/lib/validation/useTouchedErrors";
import { AddressFields } from "@/features/quotesAndBookings/types/quoteTypes";
import { createCompany } from "../db/createCompany";
import { useCompaniesAll } from "../hooks/useCompaniesAll";
import { AddressSection, EMPTY_ADDRESS } from "./AddressSection";
import { DuplicateWarning } from "./DuplicateWarning";
import { findCompanyContactDuplicates, findCompanyDuplicates } from "../utils/findDuplicates";
import { hasErrors, validateCompanyForm, type CompanyFormValues } from "../utils/formValidation";

export type CreatedCompany = {
  id: string;
  companyName: string;
  email: string;
  phone: string;
};

const COMPANY_FIELDS = ["companyName", "email", "phone"] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Fires after a successful insert, before onClose — see CreateContactModal.onCreated. */
  onCreated?: (company: CreatedCompany) => void;
  /** Extra classes for the dialog panel — used to raise it above non-Radix overlays. */
  contentClassName?: string;
};

export function CreateCompanyModal({ isOpen, onClose, onCreated, contentClassName }: Props) {
  const [values, setValues] = useState<CompanyFormValues>({
    companyName: "",
    email: "",
    phone: "",
  });
  const [notes, setNotes] = useState("");
  const [billing, setBilling] = useState<AddressFields>({ ...EMPTY_ADDRESS });
  const [shipping, setShipping] = useState<AddressFields>({ ...EMPTY_ADDRESS });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [saving, setSaving] = useState(false);

  const errors = validateCompanyForm(values);
  const { errorFor, markTouched, markAllTouched, reset: resetTouched } = useTouchedErrors(errors);

  const setValue = (key: keyof CompanyFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const { companies } = useCompaniesAll();
  const labelOf = (c: { companyName: string; email: string | null }) =>
    c.companyName + (c.email ? ` (${c.email})` : "");

  // Email/phone matches hard-block creation; a name-only match is just advisory.
  const blockingCompanies = findCompanyContactDuplicates(companies, values);
  const blockingLabels = blockingCompanies.map(labelOf);
  const nameOnlyLabels = findCompanyDuplicates(companies, {
    companyName: values.companyName,
    email: "",
    phone: "",
  })
    .filter((c) => !blockingCompanies.some((b) => b.id === c.id))
    .map(labelOf);

  const canSave = !hasErrors(errors) && !saving && blockingCompanies.length === 0;

  const reset = () => {
    setValues({ companyName: "", email: "", phone: "" });
    setNotes("");
    setBilling({ ...EMPTY_ADDRESS });
    setShipping({ ...EMPTY_ADDRESS });
    setSameAsBilling(true);
    resetTouched();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    markAllTouched(COMPANY_FIELDS);
    if (!canSave) return;

    setSaving(true);
    try {
      const id = await createCompany({
        ...values,
        notes,
        billingAddress: billing,
        shippingAddress: sameAsBilling ? billing : shipping,
        shippingSameAsBilling: sameAsBilling,
      });
      createSuccessToast([`Company "${values.companyName}" created.`]);
      onCreated?.({ id, ...values });
      handleClose();
    } catch {
      /* error toast shown by createCompany */
    } finally {
      setSaving(false);
    }
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
          <TextField
            label="Company Name"
            required
            value={values.companyName}
            onChange={setValue("companyName")}
            onBlur={() => markTouched("companyName")}
            error={errorFor("companyName")}
            placeholder="Live Nation Entertainment"
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Email"
              type="email"
              value={values.email}
              onChange={setValue("email")}
              onBlur={() => markTouched("email")}
              error={errorFor("email")}
              placeholder="info@company.com"
            />
            <TextField
              label="Phone"
              type="tel"
              value={values.phone}
              onChange={setValue("phone")}
              onBlur={() => markTouched("phone")}
              error={errorFor("phone")}
              placeholder="+1 (310) 867-7000"
            />
          </div>

          <DuplicateWarning matches={blockingLabels} kind="company" severity="block" />
          <DuplicateWarning matches={nameOnlyLabels} kind="company" severity="warn" />

          <AddressSection label="Billing Address" value={billing} onChange={setBilling} />

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sameAsBilling}
              onChange={(e) => setSameAsBilling(e.target.checked)}
              className="rounded"
            />
            Shipping same as billing
          </label>

          {!sameAsBilling && (
            <AddressSection label="Shipping Address" value={shipping} onChange={setShipping} />
          )}

          <TextAreaField
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="VIP client..."
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-1.5 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-lightBlue transition-colors cursor-pointer disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Company"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
