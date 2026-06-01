"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dropdown } from "@/components/DropDown";
import AddressAutocomplete from "@/components/AddressAutoComplete";
import { createSalesOffice, fetchQboConnections, QboConnectionOption } from "../db/salesOfficesDb";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

type AddressData = {
  street: string;
  city: string;
  stateProvince: string;
  zipPostal: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function AddOfficeModal({ open, onClose, onCreated }: Props) {
  const supabase = useClerkSupabaseClient();

  const [name, setName] = useState("");
  const [quickbookUuid, setQuickbookUuid] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [saving, setSaving] = useState(false);

  const [qboOptions, setQboOptions] = useState<QboConnectionOption[]>([]);
  const [loadingQbo, setLoadingQbo] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingQbo(true);
    fetchQboConnections(supabase)
      .then(setQboOptions)
      .finally(() => setLoadingQbo(false));
  }, [open, supabase]);

  const qboDropdownOptions = qboOptions.map((q) => ({
    label: q.displayName,
    value: q.id,
  }));

  const resetAndClose = () => {
    setName("");
    setQuickbookUuid(null);
    setAddress(null);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim() || !quickbookUuid) return;
    setSaving(true);
    try {
      await createSalesOffice(
        { name, quickbookUuid, address },
        supabase,
      );
      createSuccessToast([`Sales office "${name}" created.`]);
      resetAndClose();
      onCreated();
    } catch {
      // Error toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Sales Office</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main Office"
              className="w-full h-[40px] px-3 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <AddressAutocomplete
              initialValue=""
              onAddressSelect={(data) =>
                setAddress({
                  street: data.address ?? "",
                  city: data.city ?? "",
                  stateProvince: data.state ?? "",
                  zipPostal: data.postalCode ?? "",
                })
              }
              className="h-[40px] px-3 border rounded text-sm"
            />
            {address?.city && (
              <p className="text-xs text-gray-500 mt-1">
                {address.city}
                {address.stateProvince ? `, ${address.stateProvince}` : ""}
                {address.zipPostal ? ` ${address.zipPostal}` : ""}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QuickBooks Connection *</label>
            <Dropdown
              options={qboDropdownOptions}
              selected={quickbookUuid}
              onSelect={setQuickbookUuid}
              placeholder={loadingQbo ? "Loading..." : "Select QuickBooks..."}
              disabled={loadingQbo}
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
            disabled={!name.trim() || !quickbookUuid || saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-darkBlue rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Create Office"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
