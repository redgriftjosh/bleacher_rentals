"use client";
import { useState } from "react";

type ToggleProps = {
  label: string;
  tooltip: boolean;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export const Toggle = ({ label, tooltip, checked, onChange }: ToggleProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {tooltip && (
          <div className="relative inline-block ml-1">
            <svg
              className="w-4 h-4 text-gray-500 cursor-pointer"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              onClick={() => setShowTooltip(!showTooltip)}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div
              className={`absolute bottom-6 left-1/2 -translate-x-1/2 ${
                showTooltip ? "block" : "hidden"
              } bg-darkBlue text-white text-xs rounded py-1 px-2 w-48`}
            >
              Lenient Booking means the customer doesn't care about the number of bleachers or size
              of bleachers, they just require the number of seats. This gives us more options to
              choose from so we offer a 10% discount if they opt in.
            </div>
          </div>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          onChange={(e) => onChange(e.target.checked)}
          checked={checked}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkBlue"></div>
      </label>
    </div>
  );
};
