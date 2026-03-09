"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown } from "lucide-react";
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
import { fetchQboVendors } from "@/features/quickbooks-integration/api";
import { QboConnectionError } from "@/features/quickbooks-integration/components/QboConnectionError";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectQboVendorSimpleProps = {
  value: string | null;
  onChange: (vendorId: string | null) => void;
  placeholder?: string;
};

export function SelectQboVendorSimple({
  value,
  onChange,
  placeholder = "Select QuickBooks Vendor...",
}: SelectQboVendorSimpleProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const {
    data: vendors = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["qbo-vendors"],
    queryFn: fetchQboVendors,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  });

  // Filter vendors by search term
  const filteredVendors = useMemo(() => {
    if (!search) return vendors;
    const searchLower = search.toLowerCase();
    return vendors.filter((v) =>
      (v.displayName || v.companyName || "").toLowerCase().includes(searchLower),
    );
  }, [vendors, search]);

  const selectedVendor = vendors.find((v) => v.id === value);
  const selectedLabel = selectedVendor?.displayName || selectedVendor?.companyName || "";

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
            <span className="text-gray-500">Loading vendors...</span>
          ) : value ? (
            <span>{selectedLabel}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No vendor found.</CommandEmpty>
            <CommandGroup>
              {filteredVendors.map((vendor) => {
                const label = vendor.displayName || vendor.companyName || `Vendor ${vendor.id}`;
                const isSelected = value === vendor.id;

                return (
                  <CommandItem
                    key={vendor.id}
                    onSelect={() => {
                      onChange(vendor.id === value ? null : vendor.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                    />
                    {label}
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
