// features/workTrackers/ui/DriverDropdown.tsx
"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkTrackerDriver } from "../../types";
import { fetchDrivers } from "../../db/fetchDrivers";
import { useAuth } from "@clerk/nextjs";
import { Dropdown } from "@/components/DropDown";

type Props = {
  selectedUserId: number | null;
  onChange: (driver: WorkTrackerDriver | null) => void;
  placeholder?: string;
  className?: string;

  // If you already know the selected driver name from the WorkTracker, pass it
  // so the button can show the label even before the options load:
  selectedLabelFallback?: string;
};

export function DriverDropdown({
  selectedUserId,
  onChange,
  placeholder = "Select Driver",
  className,
  selectedLabelFallback,
}: Props) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchDrivers(token);
    },
    enabled: open,
  });

  const options =
    data?.map((d) => ({
      label: `${d.firstName} ${d.lastName}`,
      value: d.driverId,
      _row: d,
    })) ?? [];

  // Try to find the selected driver’s label from options (if loaded)
  const selectedLabelFromOptions = options.find((o) => o.value === selectedUserId)?.label;

  return (
    <div>
      <Dropdown<number>
        className={className}
        options={options}
        selected={selectedUserId ?? undefined}
        placeholder={placeholder}
        open={open}
        onOpenChange={setOpen}
        selectedLabelOverride={selectedLabelFromOptions ?? selectedLabelFallback}
        onSelect={(userId) => {
          const row = options.find((o) => o.value === userId)?._row;
          onChange(row ?? null);
        }}
        menuContent={(close) => {
          if (isLoading) {
            return <li className="px-4 py-2 text-sm text-gray-500">Loading drivers…</li>;
          }
          if (isError) {
            return <div className="px-4 py-2 text-sm text-red-600">Failed to load drivers</div>;
          }
          if (options.length === 0) {
            return <li className="px-4 py-2 text-sm text-gray-500">No drivers found</li>;
          }
          return (
            <>
              {options.map((o) => (
                <li
                  key={o.value}
                  role="option"
                  onClick={() => {
                    onChange(o._row);
                    close();
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {o.label}
                </li>
              ))}
            </>
          );
        }}
      />
    </div>
  );
}
