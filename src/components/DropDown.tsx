// components/Dropdown.tsx
"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type DropdownOption<T> = {
  label: string;
  value: T;
};

type DropdownProps<T> = {
  options: DropdownOption<T>[];
  onSelect: (value: T) => void;
  placeholder?: string;
  selected?: T;
  className?: string;
  formatSelectedLabel?: (label: string) => string;
};

export function Dropdown<T>({
  options,
  onSelect,
  placeholder = "Select an option",
  selected,
  className = "",
  formatSelectedLabel,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const rawLabel = options.find((option) => option.value === selected)?.label;
  const selectedLabel = rawLabel
    ? formatSelectedLabel
      ? formatSelectedLabel(rawLabel)
      : rawLabel
    : placeholder;

  return (
    <>
      <div ref={ref} className={`relative w-full ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full h-[40px] flex items-center text-sm text-muted-foreground font-medium cursor-pointer justify-between bg-white border rounded px-2 py-2 text-left hover:shadow transition-all"
        >
          <span>{selectedLabel}</span>
          <ChevronDown
            size={16}
            className={`ml-2 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      </div>

      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.ul
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute z-[9999] bg-white border border-gray-200 rounded shadow-lg overflow-hidden"
                style={{
                  position: "absolute",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                }}
              >
                {options.map((option) => (
                  <li
                    key={String(option.value)}
                    onClick={() => {
                      onSelect(option.value);
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {option.label}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body // 👈 Renders the dropdown directly into the body
        )}
    </>
  );
}
