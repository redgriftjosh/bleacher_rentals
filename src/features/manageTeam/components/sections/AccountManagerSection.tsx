"use client";
import { MultiSelect } from "@/components/MultiSelect";
import { useQuery } from "@tanstack/react-query";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import SectionHeader from "../util/SectionHeader";
import SectionButton from "../inputs/SectionButton";

export function AccountManagerSection() {
  const supabase = useClerkSupabaseClient();
  const isAccountManager = useCurrentUserStore((s) => s.isAccountManager);
  const summerBleacherIds = useCurrentUserStore((s) => s.summerBleacherIds);
  const winterBleacherIds = useCurrentUserStore((s) => s.winterBleacherIds);
  const assignedDriverIds = useCurrentUserStore((s) => s.assignedDriverIds);
  const setField = useCurrentUserStore((s) => s.setField);

  // Fetch bleacher options
  const { data: bleacherOptions, isLoading: isBleachersLoading } = useQuery({
    queryKey: ["bleacherOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Bleachers")
        .select("bleacher_id, bleacher_number")
        .order("bleacher_number", { ascending: true });

      if (error) throw error;
      return (data || []).map((b) => ({
        label: String(b.bleacher_number),
        value: b.bleacher_id,
      }));
    },
  });

  // Fetch driver options
  const { data: driverOptions, isLoading: isDriversLoading } = useQuery({
    queryKey: ["driverOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Users")
        .select("user_id, first_name, last_name")
        .eq("role", 3) // Driver role
        .order("first_name", { ascending: true });

      if (error) throw error;
      return (data || []).map((u) => ({
        label: `${u.first_name} ${u.last_name}`,
        value: u.user_id,
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
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium flex items-center justify-end gap-1">
              <label>Summer Bleachers</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bleachers this account manager is responsible for during summer season</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-3">
              <MultiSelect
                options={bleacherOptions || []}
                color="bg-greenAccent"
                onValueChange={(ids) => setField("summerBleacherIds", ids)}
                forceSelectedValues={summerBleacherIds}
                placeholder={isBleachersLoading ? "Loading..." : "Select Bleachers"}
                variant="inverted"
                maxCount={3}
                className="w-full"
              />
            </div>
          </div>

          {/* Winter Bleachers */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium flex items-center justify-end gap-1">
              <label>Winter Bleachers</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bleachers this account manager is responsible for during winter season</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-3">
              <MultiSelect
                options={bleacherOptions || []}
                color="bg-greenAccent"
                onValueChange={(ids) => setField("winterBleacherIds", ids)}
                forceSelectedValues={winterBleacherIds}
                placeholder={isBleachersLoading ? "Loading..." : "Select Bleachers"}
                variant="inverted"
                maxCount={3}
                className="w-full"
              />
            </div>
          </div>

          {/* Assigned Drivers */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium flex items-center justify-end gap-1">
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
              <MultiSelect
                options={driverOptions || []}
                color="bg-greenAccent"
                onValueChange={(ids) => setField("assignedDriverIds", ids)}
                forceSelectedValues={assignedDriverIds}
                placeholder={isDriversLoading ? "Loading..." : "Select Drivers"}
                variant="inverted"
                maxCount={3}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
