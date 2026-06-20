"use client";

import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useUserFormPaths } from "@/features/manageTeam/hooks/useUserFormPaths";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";

type ZoneRow = { id: string; displayName: string | null; photoPath: string | null };

const compiledZones = db
  .selectFrom("Zones as z")
  .select(["z.id as id", "z.display_name as displayName", "z.photo_path as photoPath"])
  .orderBy("z.display_name", "asc")
  .compile();

export function AccountManagerPageContent() {
  const router = useRouter();
  const params = useParams();
  const userUuidFromUrl = params.userUuid as string | undefined;
  const { basicUserInfo } = useUserFormPaths();
  const roleTabs = useCurrentUserStore((s) => s.roleTabs);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const assignedZoneEntries = useCurrentUserStore((s) => s.assignedZoneEntries);
  const setField = useCurrentUserStore((s) => s.setField);
  const isAdmin = usePermissionsStore((s) => s.isAdmin);

  const { data: zoneRows } = useTypedQuery(compiledZones, expect<ZoneRow>());
  const zones = zoneRows ?? [];

  const entryMap = useMemo(
    () => new Map(assignedZoneEntries.map((e) => [e.zoneUuid, e])),
    [assignedZoneEntries],
  );

  const toggleZone = (zoneId: string) => {
    if (entryMap.has(zoneId)) {
      setField(
        "assignedZoneEntries",
        assignedZoneEntries.filter((e) => e.zoneUuid !== zoneId),
      );
    } else {
      setField("assignedZoneEntries", [
        ...assignedZoneEntries,
        { zoneUuid: zoneId, isLead: false },
      ]);
    }
  };

  const toggleLead = (zoneId: string) => {
    setField(
      "assignedZoneEntries",
      assignedZoneEntries.map((e) => (e.zoneUuid === zoneId ? { ...e, isLead: !e.isLead } : e)),
    );
  };

  useEffect(() => {
    const isLoading = (userUuidFromUrl || existingUserUuid) && roleTabs.length === 0;

    if (!isLoading && !roleTabs.includes("account-manager")) {
      router.push(basicUserInfo);
    }
  }, [roleTabs, router, basicUserInfo, existingUserUuid, userUuidFromUrl]);

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Zone Assignments</h3>
        {!isAdmin && (
          <span className="text-xs text-gray-400">View only — admin access required</span>
        )}
      </div>
      {zones.length === 0 ? (
        <p className="text-sm text-gray-400">No zones found.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {zones.map((z) => {
            const entry = entryMap.get(z.id);
            const isAssigned = !!entry;
            const isLead = entry?.isLead ?? false;

            return (
              <div key={z.id} className="flex items-center gap-4 py-2">
                {/* Zone photo */}
                {z.photoPath ? (
                  <img
                    src={z.photoPath}
                    alt={`${z.displayName ?? "Zone"} map`}
                    className="w-16 h-10 object-contain rounded bg-sky-50 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-10 rounded bg-gray-100 shrink-0" />
                )}

                {/* Zone checkbox */}
                <label
                  className={`flex items-center gap-2 select-none flex-1 ${isAdmin ? "cursor-pointer" : "cursor-default opacity-60"}`}
                >
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={isAdmin ? () => toggleZone(z.id) : undefined}
                    disabled={!isAdmin}
                  />
                  <span className="text-sm text-gray-800">{z.displayName ?? "Unnamed Zone"}</span>
                </label>

                {/* Lead checkbox — only visible when zone is assigned */}
                {isAssigned && (
                  <label
                    className={`flex items-center gap-1.5 select-none text-sm text-gray-500 ${isAdmin ? "cursor-pointer" : "cursor-default opacity-60"}`}
                  >
                    <Checkbox
                      checked={isLead}
                      onCheckedChange={isAdmin ? () => toggleLead(z.id) : undefined}
                      disabled={!isAdmin}
                    />
                    Lead AM
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
