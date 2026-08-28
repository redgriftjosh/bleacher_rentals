"use client";

import { cn } from "@/lib/utils";

export type PillOption = {
  label: string;
  value: string;
};

type Props = {
  options: PillOption[];
  /** Selected value(s). A string for single select, an array for multi select. */
  selected: string | string[];
  onSelect: (value: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  emptyHint?: string;
  className?: string;
};

/**
 * Segmented pills, used wherever a dropdown would be overkill: task/feature status and
 * sprint labels. One tap, no menu, and the whole set of choices stays visible.
 */
export function PillGroup({
  options,
  selected,
  onSelect,
  multiple,
  disabled,
  emptyHint,
  className,
}: Props) {
  const isActive = (value: string) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  if (options.length === 0 && emptyHint) {
    return <p className="text-[13px] text-rm-ink-muted italic">{emptyHint}</p>;
  }

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {options.map((option) => {
        const active = isActive(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-2 focus-visible:ring-rm-accent focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40",
              active
                ? "bg-rm-accent text-white shadow-sm"
                : "bg-rm-sunken text-rm-ink hover:bg-rm-hairline",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
