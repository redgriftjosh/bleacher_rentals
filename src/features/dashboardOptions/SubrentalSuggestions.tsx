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

type ZoneRow = { id: string; displayName: string | null };

const compiledZones = db
  .selectFrom("Zones as z")
  .select(["z.id as id", "z.display_name as displayName"])
  .compile();

export function SubrentalSuggestions() {
  const [open, setOpen] = useState(false);

  const isAdmin = usePermissionsStore((s) => s.isAdmin);
  const accountManagerZoneIds = usePermissionsStore((s) => s.accountManagerZoneIds);

  const subrentalEvents = usePsSubrentalEvents();
  const bleachers = usePsBleachers();
  const { data: zoneRows } = useTypedQuery(compiledZones, expect<ZoneRow>());
  const zones = zoneRows ?? [];

  const subrentalHex = `#${SUBRENTAL_COLOR.toString(16).padStart(6, "0")}`;

  /** Pending subrentals relevant to this user */
  const pendingSubrentals = useMemo(() => {
    const pending = subrentalEvents.filter((sr) => sr.status === "pending");
    if (isAdmin) return pending;
    // AM: show subrentals where the bleacher belongs to one of their assigned zones
    return pending.filter((sr) => {
      if (!sr.bleacher_uuid) return false;
      const bleacher = bleachers.find((b) => b.id === sr.bleacher_uuid);
      return bleacher?.zone_uuid != null && accountManagerZoneIds.includes(bleacher.zone_uuid);
    });
  }, [subrentalEvents, bleachers, isAdmin, accountManagerZoneIds]);

  const count = pendingSubrentals.length;

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
      {count > 0 && (
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
              style={count > 0 ? { color: subrentalHex } : undefined}
            />
            <span
              className={count > 0 ? "sr-flash" : ""}
              style={count > 0 ? undefined : { color: "hsl(var(--muted-foreground))" }}
            >
              {count} Requested Sub-Rental{count !== 1 ? "s" : ""}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 p-1">
          {count === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No pending sub-rentals.</p>
          ) : (
            pendingSubrentals.map((sr) => {
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
