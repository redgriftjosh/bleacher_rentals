"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDriversForAssignment } from "../../hooks/useDriversForAssignment";
import { DriverCard } from "../util/DriverCard";

type SelectDriverProps = {
  selectedDriverUuids: string[];
  onChange: (driverUuids: string[]) => void;
  placeholder?: string;
  currentUserUuid?: string | null;
};

export function SelectDriver({
  selectedDriverUuids,
  onChange,
  placeholder = "Select Drivers...",
  currentUserUuid,
}: SelectDriverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hideAssigned, setHideAssigned] = useState(false);
  const { data: drivers = [], isLoading } = useDriversForAssignment();

  const handleToggle = (driverUuid: string) => {
    if (selectedDriverUuids.includes(driverUuid)) {
      onChange(selectedDriverUuids.filter((id) => id !== driverUuid));
    } else {
      onChange([...selectedDriverUuids, driverUuid]);
    }
  };

  const selectedCount = selectedDriverUuids.length;

  const filteredDrivers = drivers.filter((driver) => {
    const name = `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (hideAssigned) {
      const isAssignedToOther =
        !!driver.accountManagerUuid && driver.assignedUser?.userUuid !== currentUserUuid;
      return !isAssignedToOther;
    }

    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal h-auto min-h-[40px] py-2"
        >
          {selectedCount > 0 ? (
            <span className="text-gray-500">{`${selectedCount} drivers assigned`}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search driver name..."
            value={search}
            onValueChange={setSearch}
          />
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <input
              type="checkbox"
              id="hide-assigned-drivers"
              checked={hideAssigned}
              onChange={(e) => setHideAssigned(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-greenAccent focus:ring-greenAccent cursor-pointer"
            />
            <label
              htmlFor="hide-assigned-drivers"
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              Hide assigned drivers
            </label>
          </div>
          <CommandList>
            {filteredDrivers.length === 0 && <CommandEmpty>No driver found.</CommandEmpty>}
            <CommandGroup>
              <div className="flex flex-col gap-2 p-1">
                {filteredDrivers.map((driver) => {
                  const isAssignedToOther =
                    !!driver.accountManagerUuid &&
                    driver.assignedUser?.userUuid !== currentUserUuid;

                  return (
                    <DriverCard
                      key={driver.driverUuid}
                      firstName={driver.firstName}
                      lastName={driver.lastName}
                      clerkUserId={driver.clerkUserId}
                      isSelected={selectedDriverUuids.includes(driver.driverUuid)}
                      onClick={() => handleToggle(driver.driverUuid)}
                      assignedUser={driver.assignedUser}
                      isDisabled={isAssignedToOther}
                    />
                  );
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
