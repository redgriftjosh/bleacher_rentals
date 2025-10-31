"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import LinxupDeviceListItem from "./LinxupDeviceListItem";

type LinxupDevice = {
  deviceId: string;
  name: string;
  imei: string | null;
  uuid: string | null;
  vin: string | null;
  status: string | null;
  group: string | null;
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
};

const getStatusStyles = (status: string | null) => {
  if (!status) return "bg-gray-100 text-gray-600";

  const statusLower = status.toLowerCase();
  if (statusLower === "moving") {
    return "bg-green-50 text-green-700 border border-green-200";
  }
  if (statusLower === "stopped") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (statusLower === "idle") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  return "bg-gray-50 text-gray-600 border border-gray-200";
};

type SelectLinxupDeviceDropDownProps = {
  onSelect: (deviceId: string | null) => void;
  placeholder?: string;
  value?: string | null;
};

const SelectLinxupDeviceDropDown: React.FC<SelectLinxupDeviceDropDownProps> = ({
  onSelect,
  placeholder = "Select Linxup Device",
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<LinxupDevice | null>(null);

  const {
    data: devices = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["linxup-devices"],
    queryFn: async () => {
      const res = await fetch("/api/linxup/devices");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to fetch devices (${res.status})`);
      }
      return res.json() as Promise<LinxupDevice[]>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry if API is not configured
  });

  useEffect(() => {
    if (value !== undefined && value !== null) {
      const selectedOption = devices.find((option) => option.deviceId === value);
      setSelected(selectedOption ?? null);
    } else {
      setSelected(null);
    }
  }, [value, devices]);

  const handleSelect = (option: LinxupDevice | null) => {
    setSelected(option);
    onSelect(option?.deviceId ?? null);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left flex-1 col-span-3">
      <button
        type="button"
        className="inline-flex justify-between w-full rounded-md border border-gray-250 px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => !isError && setIsOpen((prev) => !prev)}
        disabled={isLoading}
        title={isError ? (error as Error)?.message : undefined}
      >
        {isLoading ? (
          "Loading devices..."
        ) : isError ? (
          <div className="text-left text-red-600 text-xs">
            <div>⚠️ Linxup not configured</div>
            <div className="text-[10px] opacity-75">Device assignment unavailable</div>
          </div>
        ) : selected ? (
          <div className="text-left flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate mb-0.5">
              {selected.name}
            </div>
            <div className="flex items-center gap-2">
              {selected.vin && (
                <span className="text-xs text-gray-600 font-mono">{selected.vin}</span>
              )}
              {selected.status && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyles(
                    selected.status
                  )}`}
                >
                  {selected.status}
                </span>
              )}
            </div>
          </div>
        ) : (
          placeholder
        )}
        <span className="ml-2 self-center">▼</span>
      </button>
      {isOpen && !isLoading && !isError && (
        <div className="absolute mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 overflow-hidden">
          <ul className="max-h-[400px] overflow-y-auto">
            {/* Option to clear selection */}
            <li
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 transition-colors"
              onClick={() => handleSelect(null)}
            >
              <div className="text-sm font-medium text-gray-500 italic">None (Clear selection)</div>
            </li>
            {devices.map((option) => (
              <LinxupDeviceListItem
                key={option.deviceId}
                device={option}
                onClick={() => handleSelect(option)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectLinxupDeviceDropDown;
