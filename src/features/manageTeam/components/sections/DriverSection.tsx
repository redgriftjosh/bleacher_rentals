"use client";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import SectionHeader from "../util/SectionHeader";
import SectionButton from "../inputs/SectionButton";
import { DriverPaymentInfo } from "./driver/DriverPaymentInfo";
import { DriverContactInfo } from "./driver/DriverContactInfo";
import { DriverVehicleInfo } from "./driver/DriverVehicleInfo";
import { DriverDocuments } from "./driver/DriverDocuments";

export function DriverSection() {
  const isDriver = useCurrentUserStore((s) => s.isDriver);
  const setField = useCurrentUserStore((s) => s.setField);

  return (
    <div className="border-t pt-2">
      <div className="flex items-center justify-between">
        {isDriver && (
          <SectionHeader
            title="Driver Configuration"
            subtitle="Configure payment, contact, vehicle, and document information"
          />
        )}
        <SectionButton
          isActive={isDriver}
          onClick={() => setField("isDriver", !isDriver)}
          activeLabel="Driver"
          inactiveLabel="Make Driver"
        />
      </div>

      {isDriver && (
        <div className="mt-4 space-y-6">
          <DriverPaymentInfo />
          <div className="border-t pt-4">
            <DriverContactInfo />
          </div>
          <div className="border-t pt-4">
            <DriverVehicleInfo />
          </div>
          <div className="border-t pt-4">
            <DriverDocuments />
          </div>
        </div>
      )}
    </div>
  );
}
