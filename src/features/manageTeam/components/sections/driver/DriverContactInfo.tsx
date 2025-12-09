"use client";
import { useCurrentUserStore } from "../../../state/useCurrentUserStore";
import AddressAutocomplete from "@/components/AddressAutoComplete";
import { AddressData } from "@/features/eventConfiguration/state/useCurrentEventStore";

export function DriverContactInfo() {
  const phoneNumber = useCurrentUserStore((s) => s.phoneNumber);
  const driverAddress = useCurrentUserStore((s) => s.driverAddress);
  const setField = useCurrentUserStore((s) => s.setField);

  const handleAddressSelect = (data: {
    address: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }) => {
    setField("driverAddress", {
      ...data,
      addressId: driverAddress?.addressId ?? null,
    });
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">Contact Information</h4>

      {/* Phone Number */}
      <div className="grid grid-cols-5 items-center gap-4">
        <label htmlFor="phoneNumber" className="col-span-2 text-right text-sm font-medium">
          Phone Number
        </label>
        <div className="col-span-3">
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber ?? ""}
            onChange={(e) => setField("phoneNumber", e.target.value || null)}
            className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      {/* Address */}
      <div className="grid grid-cols-5 items-center gap-4">
        <label htmlFor="address" className="col-span-2 text-right text-sm font-medium">
          Address
        </label>
        <div className="col-span-3">
          <AddressAutocomplete
            className="bg-white"
            onAddressSelect={handleAddressSelect}
            initialValue={driverAddress?.address || ""}
          />
        </div>
      </div>

      {driverAddress && driverAddress.city && (
        <div className="grid grid-cols-5 items-center gap-4">
          <div className="col-span-2" />
          <div className="col-span-3">
            <p className="text-xs text-gray-500">
              {driverAddress.city}, {driverAddress.state} {driverAddress.postalCode}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
