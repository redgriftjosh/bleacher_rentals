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
import { useBleachers } from "../../hooks/useBleachers";
import { BleacherCard } from "../util/BleacherCard";
import { Badge } from "@/components/ui/badge";

type SelectBleacherProps = {
  selectedBleacherIds: number[];
  onChange: (bleacherIds: number[]) => void;
  placeholder?: string;
  season: "summer" | "winter";
  currentUserId?: number | null;
};

export function SelectBleacher({
  selectedBleacherIds,
  onChange,
  placeholder = "Select Bleachers...",
  season,
  currentUserId,
}: SelectBleacherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hideAssigned, setHideAssigned] = useState(false);
  const { data: bleachers = [], isLoading } = useBleachers();

  const handleToggle = (bleacherId: number) => {
    if (selectedBleacherIds.includes(bleacherId)) {
      onChange(selectedBleacherIds.filter((id) => id !== bleacherId));
    } else {
      onChange([...selectedBleacherIds, bleacherId]);
    }
  };

  const selectedCount = selectedBleacherIds.length;
  const selectedBleacherNumbers = bleachers
    .filter((b) => selectedBleacherIds.includes(b.bleacherId))
    .map((b) => b.bleacherNumber)
    .sort((a, b) => a - b);

  // Filter bleachers by search term (bleacher number)
  const filteredBleachers = bleachers.filter((bleacher) => {
    const matchesSearch = bleacher.bleacherNumber.toString().includes(search);
    if (!matchesSearch) return false;

    // If hideAssigned is true, filter out bleachers assigned to other users
    if (hideAssigned) {
      const assignedUser =
        season === "summer" ? bleacher.summerAssignedUser : bleacher.winterAssignedUser;
      const isAssignedToOtherUser = !!assignedUser && assignedUser.userId !== currentUserId;
      return !isAssignedToOtherUser;
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
            <span className="text-gray-500">{`${selectedCount} bleachers assigned`}</span>
          ) : (
            // <div className="flex flex-wrap gap-1">
            //   {selectedBleacherNumbers.map((num) => (
            //     <Badge key={num} variant="secondary" className="bg-greenAccent/20 text-greenAccent">
            //       #{num}
            //     </Badge>
            //   ))}
            // </div>
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search bleacher number..."
            value={search}
            onValueChange={setSearch}
          />
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <input
              type="checkbox"
              id="hide-assigned"
              checked={hideAssigned}
              onChange={(e) => setHideAssigned(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-greenAccent focus:ring-greenAccent cursor-pointer"
            />
            <label
              htmlFor="hide-assigned"
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              Hide assigned bleachers
            </label>
          </div>
          <CommandList>
            {filteredBleachers.length === 0 && <CommandEmpty>No bleacher found.</CommandEmpty>}
            <CommandGroup>
              <div className="flex flex-col gap-2 p-1">
                {filteredBleachers.map((bleacher) => {
                  const assignedUser =
                    season === "summer" ? bleacher.summerAssignedUser : bleacher.winterAssignedUser;
                  const isAssignedToOtherUser =
                    !!assignedUser && assignedUser.userId !== currentUserId;

                  return (
                    <BleacherCard
                      key={bleacher.bleacherId}
                      bleacherNumber={bleacher.bleacherNumber}
                      homeBaseName={bleacher.homeBaseName}
                      winterHomeBaseName={bleacher.winterHomeBaseName}
                      bleacherRows={bleacher.bleacherRows}
                      bleacherSeats={bleacher.bleacherSeats}
                      isSelected={selectedBleacherIds.includes(bleacher.bleacherId)}
                      onClick={() => handleToggle(bleacher.bleacherId)}
                      assignedUser={assignedUser}
                      isDisabled={isAssignedToOtherUser}
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
