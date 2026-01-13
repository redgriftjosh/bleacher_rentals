import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Bleacher } from "../../types";
import { useMemo } from "react";

type BleacherFlatRow = {
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  linxup_device_id: string | null;
  booked: number | null;
  event_end: string | null;
  event_name: string | null;
  event_start: string | null;
  goodshuffle_url: string | null;
  hsl_hue: number | null;
  bleacher_uuid: string;
  summer_home_base_uuid: string | null;
  summer_home_base_name: string | null;
  winter_home_base_uuid: string | null;
  winter_home_base_name: string | null;
  bleacher_event_uuid: string | null;
  event_uuid: string | null;
  address_street: string | null;

  block_uuid: string | null;
  block_text: string | null;
  block_date: string | null;

  work_tracker_uuid: string | null;
  work_tracker_date: string | null;
};

function toBool(v: BleacherFlatRow["booked"]): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return false;
}

function reshapeBleachers(rows: BleacherFlatRow[]): Bleacher[] {
  const byBleacher = new Map<string, Bleacher>();

  const seenEvents = new Map<string, Set<string>>();
  const seenBlocks = new Map<string, Set<string>>();
  const seenWts = new Map<string, Set<string>>();

  for (const r of rows) {
    let b = byBleacher.get(r.bleacher_uuid);

    if (!b) {
      b = {
        bleacherUuid: r.bleacher_uuid,
        bleacherNumber: r.bleacher_number || 0,
        bleacherRows: r.bleacher_rows || 0,
        bleacherSeats: r.bleacher_seats || 0,
        linxupDeviceId: r.linxup_device_id,

        summerHomeBase: r.summer_home_base_uuid
          ? { homeBaseUuid: r.summer_home_base_uuid, name: r.summer_home_base_name ?? "" }
          : null,

        winterHomeBase: r.winter_home_base_uuid
          ? { homeBaseUuid: r.winter_home_base_uuid, name: r.winter_home_base_name ?? "" }
          : null,

        bleacherEvents: [],
        blocks: [],
        workTrackers: [],
      };

      byBleacher.set(r.bleacher_uuid, b);
      seenEvents.set(r.bleacher_uuid, new Set());
      seenBlocks.set(r.bleacher_uuid, new Set());
      seenWts.set(r.bleacher_uuid, new Set());
    }

    // Events
    if (r.bleacher_event_uuid) {
      const set = seenEvents.get(r.bleacher_uuid)!;
      if (!set.has(r.bleacher_event_uuid)) {
        set.add(r.bleacher_event_uuid);

        // Supabase version assumed event is always present; with left joins it can be null.
        if (r.event_uuid) {
          b.bleacherEvents.push({
            bleacherEventUuid: r.bleacher_event_uuid,
            eventUuid: r.event_uuid,
            eventName: r.event_name ?? "",
            eventStart: r.event_start ?? "",
            eventEnd: r.event_end ?? "",
            hslHue: r.hsl_hue,
            booked: toBool(r.booked),
            goodshuffleUrl: r.goodshuffle_url ?? null,
            address: r.address_street ?? "",
          });
        }
      }
    }

    // Blocks
    if (r.block_uuid) {
      const set = seenBlocks.get(r.bleacher_uuid)!;
      if (!set.has(r.block_uuid)) {
        set.add(r.block_uuid);
        b.blocks.push({
          blockUuid: r.block_uuid,
          text: r.block_text ?? "",
          date: r.block_date ?? "",
        });
      }
    }

    // WorkTrackers
    if (r.work_tracker_uuid) {
      const set = seenWts.get(r.bleacher_uuid)!;
      if (!set.has(r.work_tracker_uuid)) {
        set.add(r.work_tracker_uuid);
        b.workTrackers.push({
          workTrackerUuid: r.work_tracker_uuid,
          date: r.work_tracker_date ?? "",
        });
      }
    }
  }

  return [...byBleacher.values()];
}

export function useBleachers() {
  const compiled = db
    .selectFrom("Bleachers as b")
    .leftJoin("HomeBases as summer_hb", "summer_hb.id", "b.summer_home_base_uuid")
    .leftJoin("HomeBases as winter_hb", "winter_hb.id", "b.winter_home_base_uuid")
    .leftJoin("BleacherEvents as be", "be.bleacher_uuid", "b.id")
    .leftJoin("Events as e", "e.id", "be.event_uuid")
    .leftJoin("Addresses as a", "a.id", "e.address_uuid")
    .leftJoin("Blocks as bl", "bl.bleacher_uuid", "b.id")
    .leftJoin("WorkTrackers as wt", "wt.bleacher_uuid", "b.id")
    .select([
      "b.id as bleacher_uuid",
      "b.bleacher_number",
      "b.bleacher_rows",
      "b.bleacher_seats",
      "b.linxup_device_id",

      "summer_hb.id as summer_home_base_uuid",
      "summer_hb.home_base_name as summer_home_base_name",

      "winter_hb.id as winter_home_base_uuid",
      "winter_hb.home_base_name as winter_home_base_name",

      "be.id as bleacher_event_uuid",
      "e.id as event_uuid",
      "e.event_name",
      "e.event_start",
      "e.event_end",
      "e.hsl_hue",
      "e.booked",
      "e.goodshuffle_url",
      "a.street as address_street",

      "bl.id as block_uuid",
      "bl.text as block_text",
      "bl.date as block_date",

      "wt.id as work_tracker_uuid",
      "wt.date as work_tracker_date",
    ])
    .orderBy("b.bleacher_number", "asc")
    .compile();

  const { data: flatRows } = useTypedQuery(compiled, expect<BleacherFlatRow>());

  const bleachers = useMemo(() => {
    return reshapeBleachers(flatRows ?? []);
  }, [flatRows]);

  return bleachers;
}
