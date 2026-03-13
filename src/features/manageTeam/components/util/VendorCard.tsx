"use client";

import { AlertCircle, Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type VendorCardProps = {
  displayName: string;
  logoUrl?: string | null;
  driverCount: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDeselect?: () => void;
  qboVendorId?: string | null;
  isDisabled?: boolean;
};

export function VendorCard({
  displayName,
  logoUrl,
  driverCount,
  isSelected,
  onClick,
  onEdit,
  onDeselect,
  qboVendorId,
  isDisabled = false,
}: VendorCardProps) {
  const [isHoveringCheckmark, setIsHoveringCheckmark] = useState(false);
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative w-full p-3 rounded border-1 transition-all duration-200 cursor-pointer",
        "flex items-center gap-3",
        isDisabled
          ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-60"
          : isSelected
            ? "border-greenAccent bg-greenAccent/10 hover:shadow-md hover:border-greenAccent/50"
            : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md hover:border-greenAccent/50",
      )}
    >
      {/* Logo or Initial */}
      <div className="flex-shrink-0">
        {logoUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            <img src={logoUrl} alt={displayName} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
              isDisabled ? "bg-gray-300 text-gray-600" : "bg-greenAccent/20 text-greenAccent",
            )}
          >
            {firstLetter}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col items-start flex-1 min-w-0">
        <div
          className={cn(
            "font-semibold text-sm truncate w-full text-left",
            isDisabled ? "text-gray-400" : "text-gray-900",
          )}
        >
          {displayName}
        </div>
        <div className={cn("text-xs", isDisabled ? "text-gray-400" : "text-gray-500")}>
          {driverCount} {driverCount === 1 ? "Driver" : "Drivers"}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isDisabled && !qboVendorId && (
          <div className="relative group">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-0 pointer-events-none z-50">
              Not Linked to QBO
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
        {!isDisabled && (
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 rounded transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
            title="Edit vendor"
          >
            <Pencil className="w-4 h-4 text-gray-500 transition-colors duration-200 hover:text-greenAccent" />
          </button>
        )}
        {isSelected && onDeselect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeselect();
            }}
            onMouseEnter={() => setIsHoveringCheckmark(true)}
            onMouseLeave={() => setIsHoveringCheckmark(false)}
            className={cn(
              "flex cursor-pointer items-center justify-center w-6 h-6 rounded-full transition-all duration-200",
              isHoveringCheckmark ? "bg-red-500" : "bg-greenAccent",
            )}
            title={isHoveringCheckmark ? "Deselect vendor" : "Selected"}
          >
            {isHoveringCheckmark ? (
              <X className="w-4 h-4 text-white" />
            ) : (
              <Check className="w-4 h-4 text-white" />
            )}
          </button>
        )}
        {isSelected && !onDeselect && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-greenAccent">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
