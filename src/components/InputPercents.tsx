"use client";

import { useEffect, useState } from "react";
import { sanitizePercentInput } from "./InputPercents.logic";

export default function InputPercents({
  value,
  setValue,
  placeholder,
  ariaLabel,
}: {
  value: number;
  setValue: (value: number) => void;
  placeholder?: string;
  /** For fields whose visible <label> is not wired to this input. */
  ariaLabel?: string;
}) {
  const [valueRaw, setValueRaw] = useState<string>(`${value}%`);

  // The store is the source of truth between edits, but not during one: a
  // half-typed "14." has no number to round-trip through, so it lives here.
  useEffect(() => {
    setValueRaw((previous) =>
      sanitizePercentInput(previous).value === value ? previous : `${value}%`,
    );
  }, [value]);

  return (
    <input
      type="string"
      aria-label={ariaLabel}
      className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
      inputMode="decimal"
      value={valueRaw}
      onChange={(e) => {
        const { display, value: parsed } = sanitizePercentInput(e.target.value);
        setValueRaw(`${display}%`);
        setValue(parsed);
        // Move cursor just before the %
        requestAnimationFrame(() => {
          const input = e.target;
          input.setSelectionRange(display.length, display.length);
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
      placeholder={placeholder ?? "0%"}
    />
  );
}
