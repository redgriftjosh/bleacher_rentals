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
import {
  createSalesOffice,
  updateSalesOffice,
  fetchQboConnections,
  QboConnectionOption,
  SalesOfficeRow,
  SalesOfficeAddress,
} from "../db/salesOfficesDb";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When set, the modal edits this office; otherwise it creates a new one. */
  editing?: SalesOfficeRow | null;
};

export function AddOfficeModal({ open, onClose, onSaved, editing }: Props) {
  const supabase = useClerkSupabaseClient();

  const [name, setName] = useState("");
  const [quickbookUuid, setQuickbookUuid] = useState<string | null>(null);
  const [address, setAddress] = useState<SalesOfficeAddress | null>(null);
  const [saving, setSaving] = useState(false);

  const [qboOptions, setQboOptions] = useState<QboConnectionOption[]>([]);
  const [loadingQbo, setLoadingQbo] = useState(false);

  const isEditing = !!editing;

  useEffect(() => {
    if (!open) return;
    setLoadingQbo(true);
    fetchQboConnections(supabase)
      .then(setQboOptions)
      .finally(() => setLoadingQbo(false));
  }, [open, supabase]);

  // Hydrate fields when opening in edit mode (or reset for create)
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name ?? "");
      setQuickbookUuid(editing.quickbook_uuid ?? null);
      setAddress(
        editing.address_street
          ? {
              street: editing.address_street ?? "",
              city: editing.address_city ?? "",
              stateProvince: editing.address_state ?? "",
              zipPostal: editing.address_zip ?? "",
            }
          : null,
      );
    } else {
      setName("");
      setQuickbookUuid(null);
      setAddress(null);
    }
  }, [open, editing]);

  const qboDropdownOptions = qboOptions.map((q) => ({
    label: q.displayName,
    value: q.id,
  }));

  const resetAndClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim() || !quickbookUuid) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), quickbookUuid, address };
      if (isEditing && editing) {
        await updateSalesOffice(editing.id, editing.address_uuid, payload);
        createSuccessToast([`Sales office "${name}" updated.`]);
      } else {
        await createSalesOffice(payload);
        createSuccessToast([`Sales office "${name}" created.`]);
      }
      resetAndClose();
      onSaved();
    } catch (e) {
      createErrorToast(["Failed to save sales office.", String(e)]);
    } finally {
      setSaving(false);
    }
  };

  const addressLabel = address?.street
    ? `${address.street}${address.city ? `, ${address.city}` : ""}${address.stateProvince ? ` ${address.stateProvince}` : ""}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Sales Office" : "Add Sales Office"}</DialogTitle>
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
              initialValue={addressLabel}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QuickBooks Connection *
            </label>
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
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Office"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
