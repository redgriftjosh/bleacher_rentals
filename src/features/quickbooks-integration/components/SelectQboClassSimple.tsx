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
import { fetchQboClasses } from "@/features/quickbooks-integration/api";
import { QboConnectionError } from "@/features/quickbooks-integration/components/QboConnectionError";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type SelectQboClassSimpleProps = {
  value: string | null;
  onChange: (classId: string | null) => void;
  connectionId: string;
  placeholder?: string;
  /** Show an amber warning hint when no class is selected */
  warnWhenEmpty?: boolean;
};

export function SelectQboClassSimple({
  value,
  onChange,
  connectionId,
  placeholder = "Select QuickBooks Class...",
  warnWhenEmpty = false,
}: SelectQboClassSimpleProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const {
    data: classes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["qbo-classes", connectionId],
    queryFn: () => fetchQboClasses(connectionId),
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData,
  });

  const filteredClasses = useMemo(() => {
    if (!search) return classes;
    const searchLower = search.toLowerCase();
    return classes.filter((c) =>
      (c.fullyQualifiedName || c.name || "").toLowerCase().includes(searchLower),
    );
  }, [classes, search]);

  const selectedClass = classes.find((c) => c.id === value);
  const selectedLabel = selectedClass?.fullyQualifiedName || selectedClass?.name || "";

  if (error) {
    return <QboConnectionError />;
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-left font-normal",
              warnWhenEmpty && !value && "border-amber-400 bg-amber-50",
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="text-gray-500">Loading classes...</span>
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
            <CommandInput
              placeholder="Search by name..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No class found.</CommandEmpty>
              <CommandGroup>
                {filteredClasses.map((cls) => {
                  const label = cls.fullyQualifiedName || cls.name || `Class ${cls.id}`;
                  const isSelected = value === cls.id;

                  return (
                    <CommandItem
                      key={cls.id}
                      onSelect={() => {
                        onChange(cls.id === value ? null : cls.id);
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
      {warnWhenEmpty && !value && !isLoading && !error && (
        <p className="mt-1 text-xs text-amber-600">
          Selecting a QuickBooks class is strongly recommended for billing.
        </p>
      )}
    </div>
  );
}
