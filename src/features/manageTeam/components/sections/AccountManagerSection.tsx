"use client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import SectionHeader from "../util/SectionHeader";
import SectionButton from "../inputs/SectionButton";
import { SelectBleacher } from "../inputs/SelectBleacher";
import { SelectAccountManager } from "../inputs/SelectAccountManager";
import { useQuery } from "@tanstack/react-query";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export function AccountManagerSection() {
  const supabase = useClerkSupabaseClient();
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const isAccountManager = useCurrentUserStore((s) => s.isAccountManager);
  const summerBleacherUuids = useCurrentUserStore((s) => s.summerBleacherUuids);
  const winterBleacherUuids = useCurrentUserStore((s) => s.winterBleacherUuids);
  const assignedDriverUuids = useCurrentUserStore((s) => s.assignedDriverUuids);
  const setField = useCurrentUserStore((s) => s.setField);

  // Fetch driver options from Drivers table with user data
  const { data: driverOptions, isLoading: isDriversLoading } = useQuery({
    queryKey: ["driverOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Drivers")
        .select(
          `
          id,
          user:Users!Drivers_user_uuid_fkey(
            id,
            first_name,
            last_name
          )
        `
        )
        .eq("is_active", true);

      if (error) throw error;
      return (data || []).map((d: any) => ({
        label: `${d.user.first_name} ${d.user.last_name}`,
        value: d.id,
      }));
    },
  });

  return (
    <div className="border-t pt-2">
      <div className="flex items-center justify-between">
        {isAccountManager && (
          <SectionHeader
            title="Account Manager Configuration"
            subtitle="Assign bleachers and drivers to supervise"
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
          {/* Summer Bleachers */}
          <div className="grid grid-cols-5 items-center gap-4">
            <div className="col-span-2 text-right text-sm font-medium flex items-center justify-end gap-1">
              <label>Summer Bleachers</label>
              {/* <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bleachers this account manager is responsible for during summer season</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider> */}
            </div>
            <div className="col-span-3">
              <SelectBleacher
                selectedBleacherUuids={summerBleacherUuids}
                onChange={(ids) => setField("summerBleacherUuids", ids)}
                placeholder="Select Summer Bleachers"
                season="summer"
                currentUserUuid={existingUserUuid}
              />
            </div>
          </div>

          {/* Winter Bleachers */}
          <div className="grid grid-cols-5 items-center gap-4">
            <div className="col-span-2 text-right text-sm font-medium flex items-center justify-end gap-1">
              <label>Winter Bleachers</label>
              {/* <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bleachers this account manager is responsible for during winter season</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider> */}
            </div>
            <div className="col-span-3">
              <SelectBleacher
                selectedBleacherUuids={winterBleacherUuids}
                onChange={(ids) => setField("winterBleacherUuids", ids)}
                placeholder="Select Winter Bleachers"
                season="winter"
                currentUserUuid={existingUserUuid}
              />
            </div>
          </div>

          {/* Assigned Drivers - kept with MultiSelect for now */}
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
              {/* TODO: Could create SelectDriver component similar to SelectBleacher */}
              <div className="text-sm text-gray-500">Driver selection coming soon...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
