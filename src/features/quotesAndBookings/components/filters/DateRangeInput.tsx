"use client";

type DateRangeInputProps = {
  label: string;
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
};

export function DateRangeInput({ label, from, to, onChange }: DateRangeInputProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label} From</label>
        <input
          type="date"
          value={from ?? ""}
          onChange={(e) => onChange(e.target.value || null, to)}
          className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:border-0"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label} To</label>
        <input
          type="date"
          value={to ?? ""}
          onChange={(e) => onChange(from, e.target.value || null)}
          className="w-full px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:border-0"
        />
      </div>
    </div>
  );
}
