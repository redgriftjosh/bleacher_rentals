"use client";

import { useRef } from "react";

interface EinInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Strip everything except digits, then format as XX-XXXXXXX */
function formatEin(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/** Return just the digits from a formatted EIN */
function digitsOnly(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function EinInput({ value, onChange }: EinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = digitsOnly(value);
  const hasLetters = /[a-zA-Z]/.test(value);
  const showWarning = hasLetters || (digits.length > 0 && digits.length < 9);
  const warningText = hasLetters
    ? "Only numbers allowed"
    : digits.length > 0 && digits.length < 9
      ? `${digits.length}/9 digits`
      : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const prevDigits = digitsOnly(value);
    const newDigits = rawValue.replace(/\D/g, "").slice(0, 9);
    const formatted = formatEin(rawValue);

    onChange(formatted);

    // Restore cursor position predictably
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const selStart = input.selectionStart ?? 0;

      // Figure out how many digits are before the cursor in the raw input
      const beforeCursor = rawValue.slice(0, selStart);
      const digitsBefore = beforeCursor.replace(/\D/g, "").length;

      // Map that digit count to the formatted string position
      let pos = 0;
      let counted = 0;
      for (let i = 0; i < formatted.length && counted < digitsBefore; i++) {
        pos = i + 1;
        if (/\d/.test(formatted[i])) counted++;
      }
      // If cursor is after the dash position and we just typed, account for dash
      if (digitsBefore >= 2 && pos < formatted.length) {
        // pos is already correct from the loop
      }

      inputRef.current.setSelectionRange(pos, pos);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const input = e.currentTarget;
    const pasted = e.clipboardData.getData("text");
    const pastedDigits = pasted.replace(/\D/g, "").slice(0, 9);

    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;

    const currentDigits = digitsOnly(value);
    const beforeCursor = value.slice(0, selStart);
    const digitsBefore = beforeCursor.replace(/\D/g, "").length;
    const digitsInSelection = value.slice(selStart, selEnd).replace(/\D/g, "").length;

    const newDigits = (
      currentDigits.slice(0, digitsBefore) +
      pastedDigits +
      currentDigits.slice(digitsBefore + digitsInSelection)
    ).slice(0, 9);

    const formatted = formatEin(newDigits);
    onChange(formatted);

    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const newDigitsBefore = digitsBefore + pastedDigits.length;
      let pos = 0;
      let counted = 0;
      for (let i = 0; i < formatted.length && counted < newDigitsBefore; i++) {
        pos = i + 1;
        if (/\d/.test(formatted[i])) counted++;
      }
      inputRef.current.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-1">
      <label htmlFor="ein" className="block text-sm font-medium text-gray-700">
        EIN <span className="text-xs text-gray-400">(USA businesses)</span>
      </label>
      <input
        ref={inputRef}
        id="ein"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="12-3456789"
        maxLength={10}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
      />
      {showWarning && <p className="text-xs text-amber-600">{warningText}</p>}
    </div>
  );
}
