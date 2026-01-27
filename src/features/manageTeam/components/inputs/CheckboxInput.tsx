"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface CheckboxInputProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description: string;
  icon?: ReactNode;
  tooltip?: ReactNode;
  disabled?: boolean;
}

export function CheckboxInput({
  id,
  label,
  checked,
  onChange,
  description,
  icon,
  tooltip,
  disabled,
}: CheckboxInputProps) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <div className="text-right text-sm font-medium flex items-center justify-end gap-1">
        <label htmlFor={id}>{label}</label>
        {icon && tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{icon}</TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="col-span-3 flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(checked) => onChange(checked as boolean)}
          disabled={disabled}
        />
        <label htmlFor={id} className="text-sm text-gray-600 cursor-pointer">
          {description}
        </label>
      </div>
    </div>
  );
}
