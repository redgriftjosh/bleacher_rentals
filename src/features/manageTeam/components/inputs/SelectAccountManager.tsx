"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAccountManagers } from "../../hooks/useAccountManagers";
import { UserSmall } from "../util/UserSmall";
import { STATUSES } from "../../constants";

type SelectAccountManagerProps = {
  value: string | null;
  onChange: (accountManagerId: string | null) => void;
  placeholder?: string;
};

export function SelectAccountManager({
  value,
  onChange,
  placeholder = "Select Account Manager...",
}: SelectAccountManagerProps) {
  const [open, setOpen] = useState(false);
  const accountManagers = useAccountManagers(false);
  console.log("Account Managers:", JSON.stringify(accountManagers, null, 2));

  const selectedAccountManager = useMemo(() => {
    return accountManagers.find((am) => am.accountManagerUuid === value);
  }, [accountManagers, value]);

  const handleSelect = (accountManagerUuid: string) => {
    onChange(accountManagerUuid === value ? null : accountManagerUuid);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          {selectedAccountManager ? (
            <UserSmall
              clerkUserId={selectedAccountManager.clerkUserId}
              firstName={selectedAccountManager.firstName}
              lastName={selectedAccountManager.lastName}
            />
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search account managers..." />
          <CommandList>
            <CommandEmpty>No account manager found.</CommandEmpty>
            <CommandGroup>
              {accountManagers
                .filter((am) => am.statusUuid === STATUSES.active)
                .map((am) => (
                  <CommandItem
                    key={am.accountManagerUuid}
                    value={`${am.firstName} ${am.lastName} ${am.email}`}
                    onSelect={() => handleSelect(am.accountManagerUuid)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === am.accountManagerUuid ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <UserSmall
                      clerkUserId={am.clerkUserId}
                      firstName={am.firstName}
                      lastName={am.lastName}
                    />
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
