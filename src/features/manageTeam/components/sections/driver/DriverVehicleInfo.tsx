"use client";
import { useCurrentUserStore } from "../../../state/useCurrentUserStore";

export function DriverVehicleInfo() {
  const vehicleMake = useCurrentUserStore((s) => s.vehicleMake);
  const vehicleModel = useCurrentUserStore((s) => s.vehicleModel);
  const vehicleYear = useCurrentUserStore((s) => s.vehicleYear);
  const vehicleVin = useCurrentUserStore((s) => s.vehicleVin);
  const setField = useCurrentUserStore((s) => s.setField);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">Vehicle Information</h4>

      {/* Make */}
      <div className="grid grid-cols-5 items-center gap-4">
        <label htmlFor="vehicleMake" className="col-span-2 text-right text-sm font-medium">
          Make
        </label>
        <div className="col-span-3">
          <input
            id="vehicleMake"
            type="text"
            value={vehicleMake ?? ""}
            onChange={(e) => setField("vehicleMake", e.target.value || null)}
            className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
            placeholder="e.g., Ford, Chevrolet, Toyota"
          />
        </div>
      </div>

      {/* Model */}
      <div className="grid grid-cols-5 items-center gap-4">
        <label htmlFor="vehicleModel" className="col-span-2 text-right text-sm font-medium">
          Model
        </label>
        <div className="col-span-3">
          <input
            id="vehicleModel"
            type="text"
            value={vehicleModel ?? ""}
            onChange={(e) => setField("vehicleModel", e.target.value || null)}
            className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
            placeholder="e.g., F-150, Silverado"
          />
        </div>
      </div>

      {/* Year */}
      <div className="grid grid-cols-5 items-center gap-4">
        <label htmlFor="vehicleYear" className="col-span-2 text-right text-sm font-medium">
          Year
        </label>
        <div className="col-span-3">
          <input
            id="vehicleYear"
            type="number"
            min="1900"
            max={currentYear + 1}
            value={vehicleYear ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setField("vehicleYear", value ? parseInt(value) : null);
            }}
            className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
            placeholder={currentYear.toString()}
          />
        </div>
      </div>

      {/* VIN */}
      <div className="grid grid-cols-5 items-center gap-4">
        <label htmlFor="vehicleVin" className="col-span-2 text-right text-sm font-medium">
          VIN Number
        </label>
        <div className="col-span-3">
          <input
            id="vehicleVin"
            type="text"
            maxLength={17}
            value={vehicleVin ?? ""}
            onChange={(e) => setField("vehicleVin", e.target.value.toUpperCase() || null)}
            className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0 uppercase"
            placeholder="17-character VIN"
          />
        </div>
      </div>

      {vehicleMake && vehicleModel && vehicleYear && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}
            {vehicleVin && (
              <>
                <br />
                <strong>VIN:</strong> {vehicleVin}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
