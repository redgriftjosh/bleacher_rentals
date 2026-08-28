"use client";

import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  /** Renders at title size — used for the one field that names the record. */
  variant?: "title" | "default";
  className?: string;
};

export function TextField({
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
  ariaLabel,
  variant = "default",
  className,
}: Props) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      className={cn(
        "w-full bg-transparent text-gray-900 placeholder:text-rm-ink-faint focus:outline-none",
        "disabled:cursor-not-allowed disabled:text-rm-ink-muted",
        variant === "title" ? "text-[22px] font-semibold tracking-tight" : "text-[15px]",
        className,
      )}
    />
  );
}
