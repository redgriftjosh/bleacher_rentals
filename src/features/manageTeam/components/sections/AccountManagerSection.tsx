"use client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import SectionHeader from "../util/SectionHeader";
import SectionButton from "../inputs/SectionButton";

export function AccountManagerSection() {
  const isAccountManager = useCurrentUserStore((s) => s.isAccountManager);
  const assignedDriverUuids = useCurrentUserStore((s) => s.assignedDriverUuids);
  const setField = useCurrentUserStore((s) => s.setField);

  return (
    <div className="border-t pt-2">
      <div className="flex items-center justify-between">
        {isAccountManager && (
          <SectionHeader
            title="Account Manager Configuration"
            subtitle="Assign drivers to supervise"
          />
        )}
        <SectionButton
          isActive={isAccountManager}
          onClick={() => setField("isAccountManager", !isAccountManager)}
          activeLabel="Account Manager"
          inactiveLabel="Make Account Manager"
        />
      </div>
      {isAccountManager && (
        <div className="mt-2 space-y-2">
          {/* Assigned Drivers */}
          <div className="grid grid-cols-5 items-center gap-4">
            <div className="col-span-2 text-right text-sm font-medium flex items-center justify-end gap-1">
              <label>Assigned Drivers</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Drivers this account manager supervises</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-500">Driver selection coming soon...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
