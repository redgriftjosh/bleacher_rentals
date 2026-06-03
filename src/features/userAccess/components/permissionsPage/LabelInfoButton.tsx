"use client";

import { Info } from "lucide-react";

type LabelInfoButtonProps = {
  onClick: () => void;
};

export function LabelInfoButton({ onClick }: LabelInfoButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 cursor-pointer transition-all duration-150 hover:scale-110 hover:text-lightBlue hover:shadow-sm active:scale-95"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}
