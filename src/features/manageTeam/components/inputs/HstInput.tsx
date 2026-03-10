"use client";

import { useRef } from "react";

interface HstInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Validate HST format: 9 digits + 2 uppercase letters + 4 digits = 15 chars.
 * Returns a warning string or empty if valid/empty.
 */
function getWarning(value: string): string {
  if (!value) return "";
  if (value.length < 15) return `Format: 123456789RT0001 (${value.length}/15 characters)`;

  // Full 15 chars — check pattern
  const match = /^\d{9}[A-Z]{2}\d{4}$/.test(value);
  if (!match) return "Format must be: 123456789RT0001";
  return "";
}

export function HstInput({ value, onChange }: HstInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const selStart = input.selectionStart ?? 0;
    const rawValue = input.value;

    // Uppercase any letters, cap at 15
    const uppercased = rawValue.toUpperCase().slice(0, 15);

    onChange(uppercased);

    // Restore cursor — uppercasing doesn't change length or positions
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const pos = Math.min(selStart, uppercased.length);
      inputRef.current.setSelectionRange(pos, pos);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const input = e.currentTarget;
    const pasted = e.clipboardData.getData("text");

    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;

    const before = value.slice(0, selStart);
    const after = value.slice(selEnd);
    const combined = (before + pasted + after).toUpperCase().slice(0, 15);

    onChange(combined);

    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const newPos = Math.min(selStart + pasted.length, combined.length);
      inputRef.current.setSelectionRange(newPos, newPos);
    });
  };

  const warning = getWarning(value);

  return (
    <div className="space-y-1">
      <label htmlFor="hst" className="block text-sm font-medium text-gray-700">
        HST Number <span className="text-xs text-gray-400">(Canadian businesses)</span>
      </label>
      <input
        ref={inputRef}
        id="hst"
        type="text"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="123456789RT0001"
        maxLength={15}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
      />
      {warning && <p className="text-xs text-amber-600">{warning}</p>}
    </div>
  );
}
