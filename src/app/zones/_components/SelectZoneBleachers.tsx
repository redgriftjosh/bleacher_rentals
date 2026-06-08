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
import { useZoneBleachers } from "../_lib/hooks/useZoneBleachers";
import { isBleacherAvailableForZone } from "../_lib/filterZoneAssignments";
import { BleacherCard } from "@/features/manageTeam/components/util/BleacherCard";

type SelectZoneBleachersProps = {
  selectedBleacherUuids: string[];
  onChange: (bleacherUuids: string[]) => void;
  currentZoneUuid?: string | null;
};

export function SelectZoneBleachers({
  selectedBleacherUuids,
  onChange,
  currentZoneUuid,
}: SelectZoneBleachersProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: bleachers = [] } = useZoneBleachers();

  const handleToggle = (bleacherUuid: string) => {
    if (selectedBleacherUuids.includes(bleacherUuid)) {
      onChange(selectedBleacherUuids.filter((id) => id !== bleacherUuid));
    } else {
      onChange([...selectedBleacherUuids, bleacherUuid]);
    }
  };

  const selectedCount = selectedBleacherUuids.length;

  const filteredBleachers = bleachers.filter((b) => {
    if (!b.bleacherNumber.toString().includes(search)) return false;
    return true;
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
            <span className="text-gray-500">{`${selectedCount} bleachers assigned`}</span>
          ) : (
            <span className="text-gray-500">Select Bleachers...</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search bleacher number..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filteredBleachers.length === 0 && <CommandEmpty>No bleacher found.</CommandEmpty>}
              <CommandGroup>
                <div className="flex flex-col gap-2 p-1">
                  {filteredBleachers.map((bleacher) => {
                    const isAssignedToOtherZone = !isBleacherAvailableForZone(
                      bleacher,
                      currentZoneUuid,
                      selectedBleacherUuids,
                    );

                    return (
                      <BleacherCard
                        key={bleacher.bleacherUuid}
                        bleacherNumber={bleacher.bleacherNumber}
                        homeBaseName={bleacher.summerHomeBaseName}
                        winterHomeBaseName={bleacher.winterHomeBaseName}
                        bleacherRows={bleacher.bleacherRows}
                        bleacherSeats={bleacher.bleacherSeats}
                        isSelected={selectedBleacherUuids.includes(bleacher.bleacherUuid)}
                        onClick={() => handleToggle(bleacher.bleacherUuid)}
                        isDisabled={isAssignedToOtherZone}
                        assignedUser={
                          isAssignedToOtherZone && bleacher.zoneName
                            ? { clerkUserId: "", firstName: bleacher.zoneName, lastName: "" }
                            : null
                        }
                      />
                    );
                  })}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
