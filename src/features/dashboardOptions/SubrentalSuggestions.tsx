"use client";

import { useMemo, useState } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Handshake } from "lucide-react";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { usePsSubrentalEvents } from "@/features/dashboard/db/hooks/powersync/usePsSubrentalEvents";
import { usePsBleachers } from "@/features/dashboard/db/hooks/powersync/usePsBleachers";
import { loadSubrentalEventById } from "@/features/dashboard/db/client/loadSubrentalEventById";
import { SUBRENTAL_COLOR } from "@/features/dashboard/values/constants";
import type { SubrentalStatus } from "@/features/subrentals/state/useSubrentalEventStore";

type ZoneRow = { id: string; displayName: string | null };

const compiledZones = db
  .selectFrom("Zones as z")
  .select(["z.id as id", "z.display_name as displayName"])
  .compile();

export function SubrentalSuggestions() {
  const [open, setOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<SubrentalStatus>("pending");

  const isAdmin = usePermissionsStore((s) => s.isAdmin);
  const accountManagerZoneIds = usePermissionsStore((s) => s.accountManagerZoneIds);

  const subrentalEvents = usePsSubrentalEvents();
  const bleachers = usePsBleachers();
  const { data: zoneRows } = useTypedQuery(compiledZones, expect<ZoneRow>());
  const zones = zoneRows ?? [];

  const subrentalHex = `#${SUBRENTAL_COLOR.toString(16).padStart(6, "0")}`;

  /** All subrentals relevant to this user (across all statuses) */
  const relevantSubrentals = useMemo(() => {
    if (isAdmin) return subrentalEvents;
    return subrentalEvents.filter((sr) => {
      if (!sr.bleacher_uuid) return false;
      const bleacher = bleachers.find((b) => b.id === sr.bleacher_uuid);
      return bleacher?.zone_uuid != null && accountManagerZoneIds.includes(bleacher.zone_uuid);
    });
  }, [subrentalEvents, bleachers, isAdmin, accountManagerZoneIds]);

  const pendingCount = useMemo(
    () => relevantSubrentals.filter((sr) => sr.status === "pending").length,
    [relevantSubrentals],
  );

  const filteredSubrentals = useMemo(
    () => relevantSubrentals.filter((sr) => sr.status === activeStatus),
    [relevantSubrentals, activeStatus],
  );

  const getZoneName = (id: string | null | undefined) => {
    if (!id) return "Unknown Zone";
    return zones.find((z) => z.id === id)?.displayName ?? "Unknown Zone";
  };

  const handleSelect = async (id: string) => {
    setOpen(false);
    await loadSubrentalEventById(id);
  };

  return (
    <>
      {pendingCount > 0 && (
        <style>
          {"@keyframes sr-flash { 0%, 100% { color: #ef4444; } 50% { color: " +
            subrentalHex +
            "; } } .sr-flash { animation: sr-flash 0.6s ease-in-out infinite; }"}
        </style>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 shadow-xs
                       text-sm font-medium text-foreground
                       hover:bg-accent/50 active:bg-accent transition-colors cursor-pointer select-none"
          >
            <Handshake
              className="h-3.5 w-3.5 shrink-0"
              style={pendingCount > 0 ? { color: subrentalHex } : undefined}
            />
            <span
              className={pendingCount > 0 ? "sr-flash" : ""}
              style={pendingCount > 0 ? undefined : { color: "hsl(var(--muted-foreground))" }}
            >
              {pendingCount} Requested Sub-Rental{pendingCount !== 1 ? "s" : ""}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 p-1">
          {/* Status tabs */}
          <div className="flex gap-1 px-1 pb-1 mb-1 border-b">
            {(["pending", "accepted", "denied"] as SubrentalStatus[]).map((s) => {
              const tabCount = relevantSubrentals.filter((sr) => sr.status === s).length;
              const isActive = activeStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium capitalize cursor-pointer transition-colors
                    ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
                >
                  {s} ({tabCount})
                </button>
              );
            })}
          </div>

          {filteredSubrentals.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No {activeStatus} sub-rentals.
            </p>
          ) : (
            filteredSubrentals.map((sr) => {
              const bleacher = bleachers.find((b) => b.id === sr.bleacher_uuid);
              const bleacherLabel = bleacher
                ? `Bleacher #${bleacher.bleacher_number}`
                : "Unknown Bleacher";
              const fromZone = getZoneName(bleacher?.zone_uuid);
              const toZone = getZoneName(sr.requested_zone_uuid);

              return (
                <button
                  key={sr.id}
                  className="w-full text-left flex items-center gap-2 rounded-[5px] px-2 py-2 text-sm
                             hover:bg-accent cursor-pointer select-none"
                  onClick={() => handleSelect(sr.id)}
                >
                  <span className="font-medium shrink-0">{bleacherLabel}</span>
                  <span className="text-muted-foreground truncate">
                    {fromZone}
                    <span className="mx-1">→</span>
                    {toZone}
                  </span>
                </button>
              );
            })
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
