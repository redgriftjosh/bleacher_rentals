"use client";

import { useMemo } from "react";
import type { Database } from "../../../../../database.types";
import type { Bleacher } from "../../types";
import { useBleachersTable, type BleacherRow } from "./tables/useBleachersTable";
import { useBleacherEventsTable, type BleacherEventRow } from "./tables/useBleacherEventsTable";
import { useBlocksTable, type BlockRow } from "./tables/useBlocksTable";
import { useWorkTrackersTable, type WorkTrackerRow } from "./tables/useWorkTrackersTable";
import { useMaintenanceEventsTable, type MaintenanceEventRow } from "./tables/useMaintenanceEventsTable";
import { useDamageReportsTable, type DamageReportRow } from "./tables/useDamageReportsTable";

// ── helpers ──

function toBool(v: number | null | boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return false;
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

function assembleBleachers(
  bleacherRows: BleacherRow[],
  eventRows: BleacherEventRow[],
  blockRows: BlockRow[],
  workTrackerRows: WorkTrackerRow[],
  maintRows: MaintenanceEventRow[],
  damageRows: DamageReportRow[],
): Bleacher[] {
  const eventsByBleacher = groupBy(eventRows, (r) => r.bleacher_uuid ?? null);
  const blocksByBleacher = groupBy(blockRows, (r) => r.bleacher_uuid ?? null);
  const wtByBleacher = groupBy(workTrackerRows, (r) => r.bleacher_uuid ?? null);
  const maintByBleacher = groupBy(maintRows, (r) => r.bleacher_uuid ?? null);
  const drByBleacher = groupBy(damageRows, (r) => r.bleacher_uuid ?? null);

  return bleacherRows.map((b): Bleacher => {
    const events = eventsByBleacher.get(b.bleacher_uuid) ?? [];
    const blocks = blocksByBleacher.get(b.bleacher_uuid) ?? [];
    const wts = wtByBleacher.get(b.bleacher_uuid) ?? [];
    const maints = maintByBleacher.get(b.bleacher_uuid) ?? [];
    const drs = drByBleacher.get(b.bleacher_uuid) ?? [];

    return {
      bleacherUuid: b.bleacher_uuid,
      bleacherNumber: b.bleacher_number ?? 0,
      bleacherRows: b.bleacher_rows ?? 0,
      bleacherSeats: b.bleacher_seats ?? 0,
      linxupDeviceId: b.linxup_device_id,
      summerAccountManagerUuid: b.summer_account_manager_uuid,
      winterAccountManagerUuid: b.winter_account_manager_uuid,

      summerHomeBase: b.summer_home_base_uuid
        ? { homeBaseUuid: b.summer_home_base_uuid, name: b.summer_home_base_name ?? "" }
        : null,
      winterHomeBase: b.winter_home_base_uuid
        ? { homeBaseUuid: b.winter_home_base_uuid, name: b.winter_home_base_name ?? "" }
        : null,

      bleacherEvents: events
        .filter((e) => e.event_uuid && e.event_status !== "lost")
        .map((e) => ({
          bleacherEventUuid: e.bleacher_event_uuid,
          eventUuid: e.event_uuid!,
          eventName: e.event_name ?? "",
          eventStart: e.event_start ?? "",
          eventEnd: e.event_end ?? "",
          hslHue: e.hsl_hue,
          booked: toBool(e.booked),
          goodshuffleUrl: e.goodshuffle_url ?? null,
          address: e.address_street ?? "",
        })),

      blocks: blocks.map((bl) => ({
        blockUuid: bl.block_uuid,
        text: bl.text ?? "",
        date: bl.date ?? "",
      })),

      workTrackers: wts.map((wt) => ({
        workTrackerUuid: wt.work_tracker_uuid,
        date: wt.date ?? "",
        status: (wt.status ?? "draft") as Database["public"]["Enums"]["worktracker_status"],
        pickupTime: wt.pickup_time ?? null,
        dropoffTime: wt.dropoff_time ?? null,
        driverUuid: wt.driver_uuid,
        driverFirstName: wt.driver_first_name ?? null,
        driverLastName: wt.driver_last_name ?? null,
        dropoffAddress: wt.dropoff_address_street ?? null,
      })),

      maintenanceEvents: maints.map((m) => ({
        maintenanceEventUuid: m.maint_event_uuid,
        bleacherMaintEventUuid: m.bme_uuid,
        eventName: m.maint_event_name ?? "Maintenance / Repair",
        eventStart: m.maint_event_start ?? "",
        eventEnd: m.maint_event_end ?? "",
        costCents: m.maint_cost_cents,
        address: m.maint_address_street ?? "",
      })),

      damageReports: drs.map((dr) => ({
        damageReportUuid: dr.dr_uuid,
        bleacherUuid: dr.bleacher_uuid ?? b.bleacher_uuid,
        inspectionUuid: dr.dr_inspection_uuid ?? "",
        isSafeToSit: toBool(dr.dr_is_safe_to_sit),
        isSafeToHaul: toBool(dr.dr_is_safe_to_haul),
        note: dr.dr_note,
        createdAt: dr.dr_created_at ?? "",
        resolvedAt: dr.dr_resolved_at,
        maintenanceEventUuid: dr.dr_maintenance_event_uuid,
        workTrackerDate: dr.dr_wt_pre_date ?? dr.dr_wt_post_date ?? null,
      })),
    };
  });
}

// ── hook ──

export function useBleachers(): {
  bleachers: Bleacher[];
  isLoading: boolean;
} {
  const { data: bleacherRows, isLoading: bleachersLoading } = useBleachersTable();
  const { data: eventRows, isLoading: eventsLoading } = useBleacherEventsTable();
  const { data: blockRows, isLoading: blocksLoading } = useBlocksTable();
  const { data: wtRows, isLoading: wtsLoading } = useWorkTrackersTable();
  const { data: maintRows, isLoading: maintLoading } = useMaintenanceEventsTable();
  const { data: drRows, isLoading: drLoading } = useDamageReportsTable();

  const isLoading =
    bleachersLoading || eventsLoading || blocksLoading || wtsLoading || maintLoading || drLoading;

  const bleachers = useMemo(
    () =>
      assembleBleachers(
        bleacherRows ?? [],
        eventRows ?? [],
        blockRows ?? [],
        wtRows ?? [],
        maintRows ?? [],
        drRows ?? [],
      ),
    [bleacherRows, eventRows, blockRows, wtRows, maintRows, drRows],
  );

  return { bleachers, isLoading };
}
