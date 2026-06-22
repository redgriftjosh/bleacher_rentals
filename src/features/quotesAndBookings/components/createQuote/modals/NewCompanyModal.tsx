"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { AddressFields } from "../../../types/quoteTypes";
import { createCompany } from "../../../db/createCompany";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import AddressAutocomplete from "@/components/AddressAutoComplete";

const emptyAddress: AddressFields = {
  street: "",
  city: "",
  stateProvince: "",
  zipPostal: "",
};

function AddressSection({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AddressFields;
  onChange: (addr: AddressFields) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</h3>
      <AddressAutocomplete
        initialValue={value.street}
        onAddressSelect={(data) => {
          onChange({
            street: data.address ?? "",
            city: data.city ?? "",
            stateProvince: data.state ?? "",
            zipPostal: data.postalCode ?? "",
          });
        }}
        className="h-[40px] px-3 border rounded text-sm"
      />
      {value.city && (
        <p className="text-xs text-gray-500 mt-1">
          {value.city}{value.stateProvince ? `, ${value.stateProvince}` : ""}{value.zipPostal ? ` ${value.zipPostal}` : ""}
        </p>
      )}
    </div>
  );
}

export function NewCompanyModal() {
  const isOpen = useCreateQuoteStore((s) => s.isNewCompanyModalOpen);
  const setField = useCreateQuoteStore((s) => s.setField);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [billingAddress, setBillingAddress] = useState<AddressFields>({ ...emptyAddress });
  const [shippingAddress, setShippingAddress] = useState<AddressFields>({ ...emptyAddress });
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [saving, setSaving] = useState(false);

  const resetAndClose = () => {
    setCompanyName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setBillingAddress({ ...emptyAddress });
    setShippingAddress({ ...emptyAddress });
    setShippingSameAsBilling(true);
    setField("isNewCompanyModalOpen", false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createCompany(
        {
          companyName,
          phone,
          email,
          notes,
          billingAddress,
          shippingAddress: shippingSameAsBilling ? billingAddress : shippingAddress,
          shippingSameAsBilling,
        },
      );

      // Update parent form
      setField("companyName", companyName);
      setField("companyEmail", email);
      setField("phone", phone);
      createSuccessToast([`Company "${companyName}" created.`]);
      resetAndClose();
    } catch {
      // Error toast already shown by createCompany
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Company</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Live Nation Entertainment"
              className="w-full h-[40px] px-3 border rounded text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.com"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (310) 867-7000"
                className="w-full h-[40px] px-3 border rounded text-sm"
              />
            </div>
          </div>

          <AddressSection
            label="Billing Address"
            value={billingAddress}
            onChange={setBillingAddress}
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={shippingSameAsBilling}
              onChange={(e) => setShippingSameAsBilling(e.target.checked)}
              className="rounded"
            />
            Shipping address same as billing
          </label>

          {!shippingSameAsBilling && (
            <AddressSection
              label="Shipping Address"
              value={shippingAddress}
              onChange={setShippingAddress}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VIP client, always prioritize..."
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
            disabled={!companyName.trim() || saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Company"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
