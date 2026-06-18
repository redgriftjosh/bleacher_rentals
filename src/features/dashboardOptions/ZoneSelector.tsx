"use client";

import { useMemo, useState } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useZoneFilterStore } from "./useZoneFilterStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, MapPin, ShieldCheck, UserCheck, Eye } from "lucide-react";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { AppTooltip } from "@/components/AppTooltip";

type ZoneRow = { id: string; displayName: string | null };

const UNASSIGNED_VALUE = "__unassigned__";

export function ZoneSelector({ accountManagerId }: { accountManagerId: string | null }) {
  const [open, setOpen] = useState(false);
  const { selectedZoneIds, toggleZone, setSelectedZoneIds, showUnassigned, setShowUnassigned } =
    useZoneFilterStore();

  const isAdmin = usePermissionsStore((s) => s.isAdmin);
  const isAccountManager = usePermissionsStore((s) => s.isAccountManager);
  const accountManagerZoneIds = usePermissionsStore((s) => s.accountManagerZoneIds);
  const leadZoneIds = usePermissionsStore((s) => s.leadZoneIds);

  // Only show zone access icons for non-admin account managers
  const showAccessIcons = isAccountManager && !isAdmin;

  const compiledZones = useMemo(
    () =>
      db
        .selectFrom("Zones as z")
        .select(["z.id as id", "z.display_name as displayName"])
        .orderBy("z.display_name", "asc")
        .compile(),
    [],
  );
  const { data: zoneRows } = useTypedQuery(compiledZones, expect<ZoneRow>());
  const zones = zoneRows ?? [];

  const totalSelected = selectedZoneIds.length + (showUnassigned ? 1 : 0);
  const allCount = zones.length + 1;
  const noFilter = totalSelected === 0;

  const label = noFilter
    ? "All Zones"
    : totalSelected === 1
      ? showUnassigned
        ? "Unassigned"
        : (zones.find((z) => z.id === selectedZoneIds[0])?.displayName ?? "1 Zone")
      : `${totalSelected} of ${allCount}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 shadow-xs
                     text-sm font-medium text-foreground
                     hover:bg-accent/50 active:bg-accent transition-colors cursor-pointer select-none"
        >
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate max-w-[140px]">{label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-1">
        {zones.map((z) => {
          const checked = selectedZoneIds.includes(z.id);
          const isAssigned = accountManagerZoneIds.includes(z.id);
          const isLead = leadZoneIds.includes(z.id);

          return (
            <label
              key={z.id}
              className="flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-sm
                         hover:bg-accent cursor-pointer select-none"
            >
              <Checkbox checked={checked} onCheckedChange={() => toggleZone(z.id)} />
              <span className="truncate flex-1">{z.displayName ?? "Unnamed"}</span>
              {showAccessIcons &&
                (isLead ? (
                  <AppTooltip content="You are a lead Account Manager for this zone">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  </AppTooltip>
                ) : isAssigned ? (
                  <AppTooltip content="You have access to this zone">
                    <UserCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  </AppTooltip>
                ) : (
                  <AppTooltip content="View only — not assigned to this zone">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </AppTooltip>
                ))}
            </label>
          );
        })}

        <div className="mx-2 my-1 h-px bg-border" />

        <label
          className="flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-sm
                     hover:bg-accent cursor-pointer select-none"
        >
          <Checkbox
            checked={showUnassigned}
            onCheckedChange={(v) => setShowUnassigned(Boolean(v))}
          />
          <span className="text-muted-foreground">Unassigned</span>
        </label>

        {!noFilter && (
          <>
            <div className="mx-2 my-1 h-px bg-border" />
            <button
              onClick={() => {
                setSelectedZoneIds([]);
                setShowUnassigned(false);
              }}
              className="w-full rounded-[5px] px-2 py-1.5 text-sm text-muted-foreground
                         hover:bg-accent text-left cursor-pointer select-none"
            >
              Clear All
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
