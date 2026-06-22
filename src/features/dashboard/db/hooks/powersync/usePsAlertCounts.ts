"use client";
import { useEffect, useRef } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useAlertCountsStore } from "../../../state/useAlertCountsStore";

type AlertCountRow = {
  entity_uuid: string | null;
  entity_type: string | null;
  cnt: string;
};

const compiled = db
  .selectFrom("Alerts as a")
  .select(({ fn }) => ["a.entity_uuid", "a.entity_type", fn.count<string>("a.id").as("cnt")])
  .groupBy(["a.entity_uuid", "a.entity_type"])
  .compile();

export function usePsAlertCounts() {
  const { data: alertRows } = useTypedQuery(compiled, expect<AlertCountRow>());
  const prevKeyRef = useRef("");

  useEffect(() => {
    const rows = alertRows ?? [];
    const key = rows.map((r) => `${r.entity_uuid}:${r.entity_type}:${r.cnt}`).join("|");
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const byEvent = new Map<string, number>();
    const byBe = new Map<string, number>();
    const byWt = new Map<string, number>();
    for (const row of rows) {
      if (!row.entity_uuid) continue;
      const count = parseInt(row.cnt, 10) || 0;
      if (row.entity_type === "event") {
        byEvent.set(row.entity_uuid, (byEvent.get(row.entity_uuid) ?? 0) + count);
      } else if (row.entity_type === "bleacher_event") {
        byBe.set(row.entity_uuid, (byBe.get(row.entity_uuid) ?? 0) + count);
      } else if (row.entity_type === "work_tracker") {
        byWt.set(row.entity_uuid, (byWt.get(row.entity_uuid) ?? 0) + count);
      }
    }
    useAlertCountsStore.setState({
      byEventUuid: byEvent,
      byBleacherEventUuid: byBe,
      byWorkTrackerUuid: byWt,
    });
  }, [alertRows]);
}
