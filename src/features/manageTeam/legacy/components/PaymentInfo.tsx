import CentsInput from "@/components/CentsInput";
import { Dropdown } from "@/components/DropDown";

type PaymentInfoProps = {
  payRateInput: string;
  payRateCents: number | null;
  payCurrency: "CAD" | "USD";
  payPerUnit: "KM" | "MI" | "HR";
  onPayRateChange: (input: string, cents: number | null) => void;
  onCurrencyChange: (currency: "CAD" | "USD") => void;
  onUnitChange: (unit: "KM" | "MI" | "HR") => void;
};

export function PaymentInfo({
  payRateInput,
  payRateCents,
  payCurrency,
  payPerUnit,
  onPayRateChange,
  onCurrencyChange,
  onUnitChange,
}: PaymentInfoProps) {
  return (
    <div className="flex gap-0 items-center">
      <div className="flex-shrink-0 mr-1" style={{ width: "60px" }}>
        <CentsInput
          value={payRateInput}
          onChange={onPayRateChange}
          placeholder="0.00"
          className="w-full h-[40px] px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0 "
        />
      </div>
      <div className="flex-shrink-0 mr-1" style={{ width: "63px" }}>
        <Dropdown
          options={[
            { label: "CAD", value: "CAD" },
            { label: "USD", value: "USD" },
          ]}
          selected={payCurrency}
          onSelect={(value) => onCurrencyChange(value as "CAD" | "USD")}
          placeholder="CAD"
          className="border-x-0 rounded-none"
        />
      </div>
      <div className="flex-shrink-0" style={{ width: "63px" }}>
        <Dropdown
          options={[
            { label: "KM", value: "KM" },
            { label: "MI", value: "MI" },
            { label: "HR", value: "HR" },
          ]}
          selected={payPerUnit}
          onSelect={(value) => onUnitChange(value as "KM" | "MI" | "HR")}
          placeholder="km"
          className="rounded-l-none"
        />
      </div>
    </div>
  );
}
