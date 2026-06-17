"use client";

import { useMemo } from "react";
import { useCurrentEventStore } from "../state/useCurrentEventStore";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export function useBleacherMismatch() {
  const bleacherRequirements = useCurrentEventStore((s) => s.bleacherRequirements);
  const bleacherUuids = useCurrentEventStore((s) => s.bleacherUuids);

  const query = useMemo(
    () =>
      db
        .selectFrom("Bleachers")
        .select(["id", "bleacher_type_uuid"])
        .where("deleted", "=", 0)
        .compile(),
    [],
  );
  const { data: allBleacherRows } = useTypedQuery(
    query,
    expect<{ id: string; bleacher_type_uuid: string | null }>(),
  );

  const assignedCountByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of allBleacherRows ?? []) {
      if (!bleacherUuids.includes(row.id)) continue;
      if (!row.bleacher_type_uuid) continue;
      counts[row.bleacher_type_uuid] = (counts[row.bleacher_type_uuid] ?? 0) + 1;
    }
    return counts;
  }, [allBleacherRows, bleacherUuids]);

  const hasMismatch = useMemo(() => {
    // Any required type under- or over-assigned
    for (const req of bleacherRequirements) {
      const assigned = assignedCountByType[req.bleacherTypeUuid] ?? 0;
      if (assigned !== req.quantity) return true;
    }
    // Any assigned type with no requirement
    for (const typeUuid of Object.keys(assignedCountByType)) {
      if (!bleacherRequirements.some((r) => r.bleacherTypeUuid === typeUuid)) return true;
    }
    return false;
  }, [assignedCountByType, bleacherRequirements]);

  return { assignedCountByType, hasMismatch };
}
