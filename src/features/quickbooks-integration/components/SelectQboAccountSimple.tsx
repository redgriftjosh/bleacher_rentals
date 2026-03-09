"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
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
import { fetchQboAccounts } from "@/features/quickbooks-integration/api";
import { QboConnectionError } from "@/features/quickbooks-integration/components/QboConnectionError";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type SelectQboAccountSimpleProps = {
  value: string | null;
  onChange: (accountId: string | null) => void;
  placeholder?: string;
};

export function SelectQboAccountSimple({
  value,
  onChange,
  placeholder = "Select QuickBooks Account...",
}: SelectQboAccountSimpleProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["qbo-accounts"],
    queryFn: fetchQboAccounts,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  });

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const searchLower = search.toLowerCase();
    return accounts.filter((a) =>
      (a.fullyQualifiedName || a.name || "").toLowerCase().includes(searchLower),
    );
  }, [accounts, search]);

  const selectedAccount = accounts.find((a) => a.id === value);
  const selectedLabel = selectedAccount?.fullyQualifiedName || selectedAccount?.name || "";

  if (error) {
    return <QboConnectionError />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="text-gray-500">Loading accounts...</span>
          ) : value ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search accounts..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-gray-400 italic"
                >
                  Clear selection
                </CommandItem>
              )}
              {filteredAccounts.map((account) => {
                const isSelected = value === account.id;
                return (
                  <CommandItem
                    key={account.id}
                    onSelect={() => {
                      onChange(account.id === value ? null : account.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{account.fullyQualifiedName || account.name}</span>
                      <span className="text-xs text-gray-400 truncate">
                        {account.accountSubType}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
