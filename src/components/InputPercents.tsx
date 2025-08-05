"use client";

import { useState } from "react";

export default function InputPercents({
  value,
  setValue,
  placeholder,
}: {
  value: number;
  setValue: (value: number) => void;
  placeholder?: string;
}) {
  const [valueRaw, setValueRaw] = useState<string>(value.toString() + "%");
  return (
    <input
      type="string"
      className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
      step="1"
      min="0"
      max="100"
      value={valueRaw}
      onChange={(e) => {
        let value = e.target.value.replace(/[^0-9]/g, ""); // remove non-digits
        value = value.replace(/^0+(?!$)/, ""); // Remove leading zeros
        if (value === "") value = "0";
        let number = Math.min(100, Math.max(0, Number(value))); // Clamp to 0–100
        setValueRaw(`${number}%`);
        setValue(number);
        // Move cursor just before the %
        requestAnimationFrame(() => {
          const input = e.target;
          const cursorPos = `${number}`.length;
          input.setSelectionRange(cursorPos, cursorPos);
        });
      }}
      onFocus={(e) => {
        // Place cursor before the %
        const pos = e.target.value.length - 1;
        e.target.setSelectionRange(pos, pos);
      }}
      onClick={(e) => {
        // Also move cursor before % on click
        const input = e.target as HTMLInputElement;
        const pos = input.value.length - 1;
        input.setSelectionRange(pos, pos);
      }}
      placeholder="0%"
    />
  );
}
