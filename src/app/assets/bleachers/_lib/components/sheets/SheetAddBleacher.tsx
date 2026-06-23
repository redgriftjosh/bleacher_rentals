"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useBleacherTypesActive } from "@/features/pricingMatrix/hooks/useBleacherTypesActive";
import { usePsZones } from "@/features/dashboard/db/hooks/powersync/usePsZones";
import { useBleacherForm, useStorageLocationOptions } from "../../hooks/useBleacherForm";
import { BleacherFormFields } from "../BleacherFormFields";

export function SheetAddBleacher() {
  const [isOpen, setIsOpen] = useState(false);

  const { bleacherTypes } = useBleacherTypesActive();
  const zones = usePsZones();
  const storageLocations = useStorageLocationOptions();

  const { state, setField, reset, isTakenNumber, isLoading, save } = useBleacherForm({
    autoSuggestNumber: isOpen,
  });

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const handleSave = async () => {
    const ok = await save();
    if (ok) close();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-darkBlue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-lightBlue cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Add Bleacher
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
            onClick={close}
          />

          <div className="fixed inset-y-0 right-0 flex w-full flex-col rounded-l-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-in slide-in-from-right sm:max-w-md">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-darkBlue">Add a New Bleacher</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Fill out the form, then save to create a new bleacher.
                </p>
              </div>
              <button
                onClick={close}
                className="-mr-1 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-3.5">
                <BleacherFormFields
                  state={state}
                  setField={setField}
                  bleacherTypes={bleacherTypes}
                  zones={zones}
                  storageLocations={storageLocations}
                  isTakenNumber={isTakenNumber}
                  numberLoading={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
              <button
                onClick={close}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSave}
                className="rounded-lg bg-darkBlue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-lightBlue cursor-pointer"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
