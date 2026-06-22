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
import { useZoneAccountManagers } from "../_lib/hooks/useZoneAccountManagers";
import { DriverCard } from "@/features/manageTeam/components/util/DriverCard";

type SelectLeadAccountManagersProps = {
  accountManagerUuids: string[];
  selectedLeadUuids: string[];
  onChange: (leadUuids: string[]) => void;
};

export function SelectLeadAccountManagers({
  accountManagerUuids,
  selectedLeadUuids,
  onChange,
}: SelectLeadAccountManagersProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: allAccountManagers = [] } = useZoneAccountManagers();

  const assignedAMs = allAccountManagers.filter((am) =>
    accountManagerUuids.includes(am.accountManagerUuid),
  );

  const handleToggle = (amUuid: string) => {
    if (selectedLeadUuids.includes(amUuid)) {
      onChange(selectedLeadUuids.filter((id) => id !== amUuid));
    } else {
      onChange([...selectedLeadUuids, amUuid]);
    }
  };

  const selectedCount = selectedLeadUuids.length;

  const filtered = assignedAMs.filter((am) => {
    const name = `${am.firstName ?? ""} ${am.lastName ?? ""}`.toLowerCase();
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
            <span className="text-gray-500">{`${selectedCount} lead account manager${selectedCount > 1 ? "s" : ""}`}</span>
          ) : (
            <span className="text-gray-500">Select Lead Account Managers...</span>
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
              {filtered.length === 0 && <CommandEmpty>No account managers assigned to this zone.</CommandEmpty>}
              <CommandGroup>
                <div className="flex flex-col gap-2 p-1">
                  {filtered.map((am) => (
                    <DriverCard
                      key={am.accountManagerUuid}
                      firstName={am.firstName}
                      lastName={am.lastName}
                      clerkUserId={am.clerkUserId}
                      isSelected={selectedLeadUuids.includes(am.accountManagerUuid)}
                      onClick={() => handleToggle(am.accountManagerUuid)}
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
