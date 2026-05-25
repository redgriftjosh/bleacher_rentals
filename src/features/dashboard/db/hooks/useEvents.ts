"use client";

import { useMemo } from "react";
import type { DashboardEvent, EventStatus } from "../../types";
import { useEventsTable, type EventRow } from "./tables/useEventsTable";
import { useEventBleachersTable, type EventBleacherRow } from "./tables/useEventBleachersTable";

// ── helpers ──

function toBool(v: number | null | undefined): boolean {
  return typeof v === "number" ? v !== 0 : false;
}

/** Group an array by a key, returning a Map<key, items[]>. */
function groupBy<T>(items: T[], key: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k == null) continue;
    let arr = map.get(k);
    if (!arr) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(item);
  }
  return map;
}

// ── assembler ──

function assembleEvents(
  eventRows: EventRow[],
  bleacherRows: EventBleacherRow[],
): DashboardEvent[] {
  const bleachersByEvent = groupBy(bleacherRows, (r) => r.event_uuid ?? null);

  return eventRows.map((r): DashboardEvent => {
    const status = (r.event_status ??
      (toBool(r.booked) ? "booked" : "quoted")) as EventStatus;

    const assignedBleachers = bleachersByEvent.get(r.event_uuid) ?? [];
    const bleacherUuids: string[] = [];
    const seen = new Set<string>();
    for (const b of assignedBleachers) {
      if (b.bleacher_uuid && !seen.has(b.bleacher_uuid)) {
        seen.add(b.bleacher_uuid);
        bleacherUuids.push(b.bleacher_uuid);
      }
    }

    return {
      eventUuid: r.event_uuid,
      bleacherEventUuid: "-1",
      eventName: r.event_name ?? "",
      addressData: r.address_uuid
        ? {
            addressUuid: r.address_uuid,
            address: r.address_street ?? "",
            city: r.address_city ?? undefined,
            state: r.address_state_province ?? undefined,
            postalCode: r.address_zip_postal ?? undefined,
          }
        : null,
      seats: r.total_seats,
      sevenRow: r.seven_row,
      tenRow: r.ten_row,
      fifteenRow: r.fifteen_row,
      setupStart: r.setup_start ?? "",
      setupText: null,
      setupConfirmed: false,
      sameDaySetup: !r.setup_start,
      eventStart: r.event_start ?? "",
      eventEnd: r.event_end ?? "",
      teardownEnd: r.teardown_end ?? "",
      teardownText: null,
      teardownConfirmed: false,
      sameDayTeardown: !r.teardown_end,
      lenient: toBool(r.lenient),
      token: "",
      selectedStatus: status,
      notes: r.notes ?? "",
      numDays: 0,
      status,
      hslHue: r.hsl_hue,
      alerts: [],
      mustBeClean: toBool(r.must_be_clean),
      bleacherUuids,
      goodshuffleUrl: r.goodshuffle_url ?? null,
      ownerUserUuid: r.created_by_user_uuid ?? null,
    };
  });
}

// ── hook ──

export function useEvents(opts?: {
  onlyMine?: boolean;
  userUuid?: string | null;
}): {
  events: DashboardEvent[];
  isLoading: boolean;
} {
  const { data: eventRows, isLoading: eventsLoading } = useEventsTable(opts);
  const { data: bleacherRows, isLoading: bleachersLoading } = useEventBleachersTable();

  const isLoading = eventsLoading || bleachersLoading;

  const events = useMemo(
    () => assembleEvents(eventRows ?? [], bleacherRows ?? []),
    [eventRows, bleacherRows],
  );

  return { events, isLoading };
}
