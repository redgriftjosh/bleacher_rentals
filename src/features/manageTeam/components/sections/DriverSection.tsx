"use client";
import InputPercents from "@/components/InputPercents";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dropdown } from "@/components/DropDown";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import SectionHeader from "../util/SectionHeader";
import SectionButton from "../inputs/SectionButton";

export function DriverSection() {
  const isDriver = useCurrentUserStore((s) => s.isDriver);
  const tax = useCurrentUserStore((s) => s.tax);
  const payRateCents = useCurrentUserStore((s) => s.payRateCents);
  const payCurrency = useCurrentUserStore((s) => s.payCurrency);
  const payPerUnit = useCurrentUserStore((s) => s.payPerUnit);
  const setField = useCurrentUserStore((s) => s.setField);

  const handlePayRateChange = (input: string) => {
    const numericValue = parseFloat(input);
    if (!isNaN(numericValue)) {
      setField("payRateCents", Math.round(numericValue * 100));
    } else {
      setField("payRateCents", null);
    }
  };

  const currencyOptions = [
    { label: "CAD", value: "CAD" },
    { label: "USD", value: "USD" },
  ];

  const unitOptions = [
    { label: "KM", value: "KM" },
    { label: "MI", value: "MI" },
    { label: "HR", value: "HR" },
  ];

  const payRateDisplay = payRateCents !== null ? (payRateCents / 100).toFixed(2) : "";

  return (
    <div className="border-t pt-2">
      <div className="flex items-center justify-between">
        {isDriver && (
          <SectionHeader
            title="Driver Configuration"
            subtitle="Configure payment information and work tracking settings"
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
        <div className="mt-2 space-y-2">
          {/* Tax */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium flex items-center justify-end gap-1">
              <label htmlFor="tax">Tax</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Does this driver charge tax?</p>
                    <p>This field is the amount of tax that the driver charges.</p>
                    <p>If they make $1000 on their work tracker and this field is 10% then</p>
                    <p>the driver will get paid $1100.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-3">
              <InputPercents value={tax ?? 0} setValue={(value) => setField("tax", value)} />
            </div>
          </div>

          {/* Pay Rate */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium flex items-center justify-end gap-1">
              <label htmlFor="payRate">Pay Rate</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>How much does this driver get paid per unit?</p>
                    <p>For example: $2.50 per KM, or $50.00 per HR</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-3">
              <input
                id="payRate"
                type="number"
                step="0.01"
                value={payRateDisplay}
                onChange={(e) => handlePayRateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Currency */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="currency" className="text-right text-sm font-medium">
              Currency
            </label>
            <div className="col-span-3">
              <Dropdown
                options={currencyOptions}
                selected={payCurrency}
                onSelect={(value) => setField("payCurrency", value as "CAD" | "USD")}
                placeholder="Select Currency"
              />
            </div>
          </div>

          {/* Unit */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="unit" className="text-right text-sm font-medium">
              Per Unit
            </label>
            <div className="col-span-3">
              <Dropdown
                options={unitOptions}
                selected={payPerUnit}
                onSelect={(value) => setField("payPerUnit", value as "KM" | "MI" | "HR")}
                placeholder="Select Unit"
              />
            </div>
          </div>

          {/* Preview */}
          {payRateCents !== null && payRateCents > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Preview:</strong> ${(payRateCents / 100).toFixed(2)} {payCurrency} per{" "}
                {payPerUnit}
                {` + ${tax}% tax`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
