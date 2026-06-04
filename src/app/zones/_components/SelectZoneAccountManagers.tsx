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

type SelectZoneAccountManagersProps = {
  selectedAccountManagerUuids: string[];
  onChange: (accountManagerUuids: string[]) => void;
};

export function SelectZoneAccountManagers({
  selectedAccountManagerUuids,
  onChange,
}: SelectZoneAccountManagersProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: accountManagers = [] } = useZoneAccountManagers();

  const handleToggle = (amUuid: string) => {
    if (selectedAccountManagerUuids.includes(amUuid)) {
      onChange(selectedAccountManagerUuids.filter((id) => id !== amUuid));
    } else {
      onChange([...selectedAccountManagerUuids, amUuid]);
    }
  };

  const selectedCount = selectedAccountManagerUuids.length;

  const filtered = accountManagers.filter((am) => {
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
            <span className="text-gray-500">{`${selectedCount} account managers assigned`}</span>
          ) : (
            <span className="text-gray-500">Select Account Managers...</span>
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
              {filtered.length === 0 && <CommandEmpty>No account manager found.</CommandEmpty>}
              <CommandGroup>
                <div className="flex flex-col gap-2 p-1">
                  {filtered.map((am) => (
                    <DriverCard
                      key={am.accountManagerUuid}
                      firstName={am.firstName}
                      lastName={am.lastName}
                      clerkUserId={am.clerkUserId}
                      isSelected={selectedAccountManagerUuids.includes(am.accountManagerUuid)}
                      onClick={() => handleToggle(am.accountManagerUuid)}
                      assignedUser={
                        am.zoneNames.length > 0
                          ? {
                              clerkUserId: null,
                              firstName: am.zoneNames.join(", "),
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
