"use client";

import { useState } from "react";
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
import { UserSmall } from "@/features/manageTeam/components/util/UserSmall";
import { ReactNode } from "react";

export type UserOption = {
  id: string;
  clerkUserId: string | null;
  firstName: string | null;
  lastName: string | null;
  email?: string | null;
};

type SelectUserDropDownProps<T extends UserOption> = {
  options: T[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  getOptionId: (option: T) => string;
  getSearchValue?: (option: T) => string;
  children?: ReactNode;
};

export function SelectUserDropDown<T extends UserOption>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  isLoading = false,
  getOptionId,
  getSearchValue,
  children,
}: SelectUserDropDownProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => getOptionId(opt) === value);

  const handleSelect = (id: string) => {
    onChange(id === value ? null : id);
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
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="text-gray-500">Loading...</span>
          ) : selectedOption ? (
            <UserSmall
              clerkUserId={selectedOption.clerkUserId}
              firstName={selectedOption.firstName}
              lastName={selectedOption.lastName}
            />
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {value && !isLoading && (
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
          <CommandInput placeholder={searchPlaceholder} />
          {children}
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const id = getOptionId(option);
                const searchValue = getSearchValue
                  ? getSearchValue(option)
                  : `${option.firstName} ${option.lastName} ${option.email ?? ""}`;
                return (
                  <CommandItem key={id} value={searchValue} onSelect={() => handleSelect(id)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", value === id ? "opacity-100" : "opacity-0")}
                    />
                    <UserSmall
                      clerkUserId={option.clerkUserId}
                      firstName={option.firstName}
                      lastName={option.lastName}
                    />
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
