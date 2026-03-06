"use client";

import InputPercents from "@/components/InputPercents";
import CentsInput from "@/components/CentsInput";
import { Dropdown } from "@/components/DropDown";
import { SelectAccountManager } from "@/features/manageTeam/components/inputs/SelectAccountManager";
import { VendorSelection } from "@/features/manageTeam/components/inputs/VendorSelection";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import AddressAutocomplete from "@/components/AddressAutoComplete";
import { FileUploadInput } from "@/features/manageTeam/components/inputs/FileUploadInput";
import { useUserFormPaths } from "@/features/manageTeam/hooks/useUserFormPaths";
import { CountryIndicator } from "@/features/manageTeam/components/CountryIndicator";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

const currencyOptions = [
  { label: "CAD", value: "CAD" },
  { label: "USD", value: "USD" },
];

const unitOptions = [
  { label: "KM", value: "KM" },
  { label: "MI", value: "MI" },
  { label: "HR", value: "HR" },
];

const driverTypeOptions = [
  { label: "Employee", value: "employee" },
  { label: "Contractor", value: "contractor" },
];

export function DriverPageContent() {
  const router = useRouter();
  const params = useParams();
  const userUuidFromUrl = params.userUuid as string | undefined;
  const { basicUserInfo } = useUserFormPaths();
  const roleTabs = useCurrentUserStore((s) => s.roleTabs);
  const vendorUuid = useCurrentUserStore((s) => s.vendorUuid);
  const setField = useCurrentUserStore((s) => s.setField);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);

  useEffect(() => {
    // Don't redirect while loading:
    // - If we have a userUuid in the URL but roleTabs is empty, we're still loading
    // - If existingUserUuid is set but roleTabs is empty, we're still loading
    const isLoading = (userUuidFromUrl || existingUserUuid) && roleTabs.length === 0;

    if (!isLoading && !roleTabs.includes("driver")) {
      router.push(basicUserInfo);
    }
  }, [roleTabs, router, basicUserInfo, existingUserUuid, userUuidFromUrl]);

  // Driver type state (client-side only)
  const [driverType, setDriverType] = useState<"employee" | "contractor">("employee");

  // Initialize driver type based on existing vendorUuid
  useEffect(() => {
    if (vendorUuid) {
      setDriverType("contractor");
    }
  }, [vendorUuid]);

  // Handle driver type change
  const handleDriverTypeChange = (type: "employee" | "contractor") => {
    setDriverType(type);
    // Clear vendor if switching to employee
    if (type === "employee") {
      setField("vendorUuid", null);
    }
  };

  const tax = useCurrentUserStore((s) => s.tax);
  const payRateCents = useCurrentUserStore((s) => s.payRateCents);
  const payCurrency = useCurrentUserStore((s) => s.payCurrency);
  const payPerUnit = useCurrentUserStore((s) => s.payPerUnit);
  const accountManagerUuid = useCurrentUserStore((s) => s.accountManagerUuid);
  const phoneNumber = useCurrentUserStore((s) => s.phoneNumber);
  const homeAddress = useCurrentUserStore((s) => s.homeAddress);
  const homeState = useCurrentUserStore((s) => s.homeState);
  const vehicleMake = useCurrentUserStore((s) => s.vehicleMake);
  const vehicleModel = useCurrentUserStore((s) => s.vehicleModel);
  const vehicleYear = useCurrentUserStore((s) => s.vehicleYear);
  const vehicleVin = useCurrentUserStore((s) => s.vehicleVin);
  const licensePhotoPath = useCurrentUserStore((s) => s.licensePhotoPath);
  const insurancePhotoPath = useCurrentUserStore((s) => s.insurancePhotoPath);
  const medicalCardPhotoPath = useCurrentUserStore((s) => s.medicalCardPhotoPath);

  // Pay rate display state for CentsInput
  const [payRateDisplay, setPayRateDisplay] = useState(
    payRateCents !== null ? (payRateCents / 100).toFixed(2) : "",
  );

  // Only sync when existingUserUuid changes (loading a different user)
  useEffect(() => {
    const displayValue = payRateCents !== null ? (payRateCents / 100).toFixed(2) : "";
    setPayRateDisplay(displayValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingUserUuid]);

  const handlePayRateChange = (displayValue: string, cents: number | null) => {
    setPayRateDisplay(displayValue);
    setField("payRateCents", cents);
  };

  // Detect USA states (normalized to lowercase for comparison)
  const usaStates = [
    "alabama",
    "alaska",
    "arizona",
    "arkansas",
    "california",
    "colorado",
    "connecticut",
    "delaware",
    "florida",
    "georgia",
    "hawaii",
    "idaho",
    "illinois",
    "indiana",
    "iowa",
    "kansas",
    "kentucky",
    "louisiana",
    "maine",
    "maryland",
    "massachusetts",
    "michigan",
    "minnesota",
    "mississippi",
    "missouri",
    "montana",
    "nebraska",
    "nevada",
    "new hampshire",
    "new jersey",
    "new mexico",
    "new york",
    "north carolina",
    "north dakota",
    "ohio",
    "oklahoma",
    "oregon",
    "pennsylvania",
    "rhode island",
    "south carolina",
    "south dakota",
    "tennessee",
    "texas",
    "utah",
    "vermont",
    "virginia",
    "washington",
    "west virginia",
    "wisconsin",
    "wyoming",
  ];
  const isUSADriver =
    homeState?.toLowerCase().includes("usa") ||
    homeState?.toLowerCase().includes("united states") ||
    usaStates.some((state) => homeState?.toLowerCase() === state);

  // Detect Canadian provinces (normalized to lowercase for comparison)
  const canadianProvinces = [
    "alberta",
    "british columbia",
    "manitoba",
    "new brunswick",
    "newfoundland and labrador",
    "newfoundland",
    "nova scotia",
    "northwest territories",
    "nunavut",
    "ontario",
    "prince edward island",
    "quebec",
    "saskatchewan",
    "yukon",
  ];
  const isCanadaDriver =
    homeState?.toLowerCase().includes("canada") ||
    canadianProvinces.some((prov) => homeState?.toLowerCase() === prov);

  // Generate storage path prefix for uploads (use temp ID if new user)
  const driverStoragePath = existingUserUuid || "temp-driver";

  return (
    <div className="space-y-6">
      {/* Manager Setup Section */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Manager Setup</h2>
          <p className="text-sm text-gray-600">
            This driver cannot set this information. You are required to input this info for the
            driver.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
            {/* Account Manager */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Account Manager
              </label>
              <SelectAccountManager
                value={accountManagerUuid}
                onChange={(value) => setField("accountManagerUuid", value)}
                placeholder="Select Account Manager..."
              />
            </div>

            {/* Vendor Card / Ghost Card */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vendor Company</label>
              <VendorSelection
                value={vendorUuid}
                onChange={(value) => setField("vendorUuid", value)}
                driverType={driverType}
              />
            </div>

            {/* Driver Type Dropdown */}
            <div className="lg:w-[180px]">
              <label className="mb-1 block text-sm font-medium text-gray-700">Driver Type</label>
              <Dropdown
                options={driverTypeOptions}
                selected={driverType}
                onSelect={(value) => handleDriverTypeChange(value as "employee" | "contractor")}
                placeholder="Select Type"
              />
            </div>
          </div>

          {driverType === "contractor" && !vendorUuid && (
            <p className="text-xs text-red-600">
              Contractors must be assigned to a vendor company for payment tracking and QuickBooks
              integration.
            </p>
          )}
          {driverType === "contractor" && vendorUuid && (
            <p className="text-xs text-gray-500">
              Contractor is assigned to a vendor for payment tracking and QuickBooks integration.
            </p>
          )}
        </div>

        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pay Rate</label>
              <div style={{ height: "calc(2.5rem + 0px)" }}>
                <CentsInput
                  value={payRateDisplay}
                  onChange={handlePayRateChange}
                  placeholder="0.00"
                  className="h-full w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
              <Dropdown
                options={currencyOptions}
                selected={payCurrency}
                onSelect={(value) => setField("payCurrency", value as "CAD" | "USD")}
                placeholder="Select Currency"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Per Unit</label>
              <Dropdown
                options={unitOptions}
                selected={payPerUnit}
                onSelect={(value) => setField("payPerUnit", value as "KM" | "MI" | "HR")}
                placeholder="Select Unit"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tax</label>
              <div style={{ height: "calc(2.5rem + 0px)" }}>
                <InputPercents value={tax ?? 0} setValue={(value) => setField("tax", value)} />
              </div>
            </div>
          </div>

          {payRateCents !== null && payRateCents > 0 && (
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <strong>Preview:</strong> ${(payRateCents / 100).toFixed(2)} {payCurrency} per{" "}
                {payPerUnit}
                {` + ${tax ?? 0}% tax`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Driver Setup Section */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Driver Setup</h2>
          <p className="text-sm text-gray-600">
            The Driver has the ability to set this data in their mobile application, so you&apos;re
            not required to fill this out if you don&apos;t want to.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber ?? ""}
              onChange={(e) => setField("phoneNumber", e.target.value || null)}
              className="w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
              placeholder="(123) 456-7890"
            />
          </div>

          <div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Home Address</label>
                <AddressAutocomplete
                  className="bg-white"
                  onAddressSelect={(data) => {
                    setField("homeAddress", data.address);
                    setField("homeCity", data.city ?? null);
                    setField("homeState", data.state ?? null);
                    setField("homePostalCode", data.postalCode ?? null);
                  }}
                  initialValue={homeAddress ?? ""}
                />
              </div>
              {/* Country Indicator Badge */}
              {isUSADriver && <CountryIndicator country="usa" />}
              {isCanadaDriver && <CountryIndicator country="canada" />}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Vehicle Information</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Make</label>
                <input
                  type="text"
                  value={vehicleMake ?? ""}
                  onChange={(e) => setField("vehicleMake", e.target.value || null)}
                  className="w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  placeholder="e.g., Ford"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={vehicleModel ?? ""}
                  onChange={(e) => setField("vehicleModel", e.target.value || null)}
                  className="w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  placeholder="e.g., F-150"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                <input
                  type="number"
                  value={vehicleYear ?? ""}
                  onChange={(e) =>
                    setField("vehicleYear", e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  placeholder="e.g., 2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">VIN Number</label>
                <input
                  type="text"
                  value={vehicleVin ?? ""}
                  onChange={(e) => setField("vehicleVin", e.target.value || null)}
                  className="w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  placeholder="17-digit VIN"
                  maxLength={17}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">Document Uploads</h3>
            <div className="space-y-3">
              <FileUploadInput
                label="License Photo"
                bucket="driver-documents"
                storagePath={`driver-documents/${driverStoragePath}/license`}
                value={licensePhotoPath}
                onChange={(path) => setField("licensePhotoPath", path)}
              />

              <FileUploadInput
                label="Insurance Photo"
                bucket="driver-documents"
                storagePath={`driver-documents/${driverStoragePath}/insurance`}
                value={insurancePhotoPath}
                onChange={(path) => setField("insurancePhotoPath", path)}
              />

              {isUSADriver ? (
                <FileUploadInput
                  label="Medical Card Photo"
                  bucket="driver-documents"
                  storagePath={`driver-documents/${driverStoragePath}/medical_card`}
                  value={medicalCardPhotoPath}
                  onChange={(path) => setField("medicalCardPhotoPath", path)}
                />
              ) : (
                <div className="rounded border-2 border-gray-300 bg-gray-50 p-4 text-center">
                  <p className="text-sm font-medium text-gray-700">Medical Card Not Required</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {isCanadaDriver
                      ? "Canadian drivers do not need to upload a medical card."
                      : "Medical card is only required for drivers with a USA address."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
