"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useZoneDrivers } from "../_lib/hooks/useZoneDrivers";
import { DriverCard } from "@/features/manageTeam/components/util/DriverCard";

type SelectZoneDriversProps = {
  selectedDriverUuids: string[];
  onChange: (driverUuids: string[]) => void;
};

export function SelectZoneDrivers({
  selectedDriverUuids,
  onChange,
}: SelectZoneDriversProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: drivers = [] } = useZoneDrivers();

  const handleToggle = (driverUuid: string) => {
    if (selectedDriverUuids.includes(driverUuid)) {
      onChange(selectedDriverUuids.filter((id) => id !== driverUuid));
    } else {
      onChange([...selectedDriverUuids, driverUuid]);
    }
  };

  const selectedCount = selectedDriverUuids.length;

  const filtered = drivers.filter((d) => {
    const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal h-auto min-h-[40px] py-2"
        >
          {selectedCount > 0 ? (
            <span className="text-gray-500">{`${selectedCount} drivers assigned`}</span>
          ) : (
            <span className="text-gray-500">Select Drivers...</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filtered.length === 0 && <CommandEmpty>No driver found.</CommandEmpty>}
              <CommandGroup>
                <div className="flex flex-col gap-2 p-1">
                  {filtered.map((driver) => (
                    <DriverCard
                      key={driver.driverUuid}
                      firstName={driver.firstName}
                      lastName={driver.lastName}
                      clerkUserId={driver.clerkUserId}
                      isSelected={selectedDriverUuids.includes(driver.driverUuid)}
                      onClick={() => handleToggle(driver.driverUuid)}
                      assignedUser={
                        driver.zoneNames.length > 0
                          ? {
                              clerkUserId: null,
                              firstName: driver.zoneNames.join(", "),
                              lastName: null,
                            }
                          : null
                      }
                    />
                  ))}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
