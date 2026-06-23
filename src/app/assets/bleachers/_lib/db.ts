"use client";
import { FormattedBleacher } from "./types";
import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll, useTypedQuery } from "@/lib/powersync/typedQuery";
import { InsertBleacher, UpdateBleacher } from "@/types/tables/Bleachers";
import { useMemo } from "react";

type Query = {
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  deleted: number | null;
  hitch_type: string | null;
  vin_number: string | null;
  tag_number: string | null;
  manufacturer: string | null;
  height_folded_ft: number | null;
  gvwr: number | null;
  trailer_length: number | null;
  trailer_length_in: number | null;
  trailer_height_in: number | null;
  opening_direction: string | null;
  nvis_pdf_path: string | null;
  zone_uuid: string | null;
  zone_name: string | null;
};

// ── List (reactive PowerSync read) ─────────────────────────────────────
export function useBleachersQuery(showDeleted: boolean = false) {
  let query = db
    .selectFrom("Bleachers as b")
    .leftJoin("Zones as z", "z.id", "b.zone_uuid")
    .select([
      "b.bleacher_number",
      "b.bleacher_rows",
      "b.bleacher_seats",
      "b.deleted",
      "b.hitch_type",
      "b.vin_number",
      "b.tag_number",
      "b.manufacturer",
      "b.height_folded_ft",
      "b.gvwr",
      "b.trailer_length",
      "b.opening_direction",
      "b.nvis_pdf_path",
      "b.trailer_length_in",
      "b.trailer_height_in",

      // zone fields
      "z.id as zone_uuid",
      "z.display_name as zone_name",
    ]);

  if (!showDeleted) {
    query = query.where("b.deleted", "=", 0);
  }

  const compiled = query.orderBy("b.bleacher_number", "desc").compile();

  const { data } = useTypedQuery(compiled, expect<Query>());
  const formattedBleachers: FormattedBleacher[] = (data || []).map((bleacher) => ({
    bleacherNumber: bleacher.bleacher_number || 0,
    bleacherRows: bleacher.bleacher_rows || 0,
    bleacherSeats: bleacher.bleacher_seats || 0,
    deleted: Boolean(bleacher.deleted),
    hitchType: bleacher.hitch_type ?? null,
    vinNumber: bleacher.vin_number ?? null,
    tagNumber: bleacher.tag_number ?? null,
    manufacturer: bleacher.manufacturer ?? null,
    heightFoldedFt: bleacher.height_folded_ft ?? null,
    gvwr: bleacher.gvwr ?? null,
    trailerLength: bleacher.trailer_length ?? null,
    trailerLengthIn: bleacher.trailer_length_in ?? null,
    trailerHeightIn: bleacher.trailer_height_in ?? null,
    openingDirection: bleacher.opening_direction ?? null,
    nvisPdfPath: bleacher.nvis_pdf_path ?? null,
    zone: {
      zoneUuid: bleacher.zone_uuid ?? "",
      zoneName: bleacher.zone_name ?? "",
    },
  }));

  return formattedBleachers;
}

// ── Single bleacher for editing (reactive PowerSync read) ──────────────
export type EditBleacherRow = {
  id: string;
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  deleted: number | null;
  hitch_type: string | null;
  vin_number: string | null;
  tag_number: string | null;
  manufacturer: string | null;
  gvwr: number | null;
  opening_direction: string | null;
  nvis_pdf_path: string | null;
  trailer_length_in: number | null;
  trailer_height_in: number | null;
  zone_uuid: string | null;
  linxup_device_id: string | null;
  bleacher_type_uuid: string | null;
  storage_location_uuid: string | null;
};

export function useBleacherByNumber(bleacherNumber: number | null): EditBleacherRow | null {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Bleachers as b")
        .select([
          "b.id",
          "b.bleacher_number",
          "b.bleacher_rows",
          "b.bleacher_seats",
          "b.deleted",
          "b.hitch_type",
          "b.vin_number",
          "b.tag_number",
          "b.manufacturer",
          "b.gvwr",
          "b.opening_direction",
          "b.nvis_pdf_path",
          "b.trailer_length_in",
          "b.trailer_height_in",
          "b.zone_uuid",
          "b.linxup_device_id",
          "b.bleacher_type_uuid",
          "b.storage_location_uuid",
        ])
        .where("b.bleacher_number", "=", bleacherNumber ?? -1)
        .limit(1)
        .compile(),
    [bleacherNumber],
  );

  const { data } = useTypedQuery(compiled, expect<EditBleacherRow>());
  return data?.[0] ?? null;
}

// ── Taken bleacher numbers (reactive PowerSync read) ───────────────────
export function useTakenBleacherNumbers(): { numbers: number[]; isLoading: boolean } {
  const compiled = useMemo(
    () => db.selectFrom("Bleachers").select(["bleacher_number"]).compile(),
    [],
  );
  const { data } = useTypedQuery(compiled, expect<{ bleacher_number: number | null }>());
  const numbers = useMemo(
    () =>
      (data ?? [])
        .map((r) => r.bleacher_number)
        .filter((n): n is number => typeof n === "number"),
    [data],
  );
  return { numbers, isLoading: data === undefined };
}

// ── Total towed distance for a bleacher (reactive) ─────────────────────
export function useBleacherTotalDistance(bleacherUuid: string | null): number {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("WorkTrackers")
        .select(["distance_meters"])
        .where("bleacher_uuid", "=", bleacherUuid ?? "")
        .compile(),
    [bleacherUuid],
  );

  const { data = [] } = useTypedQuery(compiled, expect<{ distance_meters: number | null }>());

  return useMemo(() => data.reduce((sum, r) => sum + (r.distance_meters ?? 0), 0), [data]);
}

// ── Writes (PowerSync local-first) ─────────────────────────────────────

/**
 * Finds the BleacherType for a given row count (PowerSync local read), or
 * creates one if none exists. Returns the type uuid.
 */
async function findOrCreateBleacherType(rowCount: number): Promise<string> {
  const existing = await typedGetAll(
    db
      .selectFrom("BleacherTypes")
      .select(["id"])
      .where("row_count", "=", rowCount)
      .where("deleted", "=", 0)
      .limit(1)
      .compile(),
    expect<{ id: string }>(),
  );

  if (existing[0]) return existing[0].id;

  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("BleacherTypes")
      .values({ id, name: `${rowCount} Row`, row_count: rowCount, deleted: 0 } as any)
      .compile(),
  );
  return id;
}

function successToast(message: string) {
  toast.custom((t) => React.createElement(SuccessToast, { id: t, lines: [message] }), {
    duration: 10000,
  });
}

function errorToast(lines: string[]) {
  toast.custom((t) => React.createElement(ErrorToast, { id: t, lines }), { duration: 10000 });
}

export async function insertBleacher(bleacher: InsertBleacher): Promise<void> {
  try {
    const bleacherTypeUuid = await findOrCreateBleacherType(bleacher.bleacher_rows);
    await typedExecute(
      db
        .insertInto("Bleachers")
        .values({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          deleted: 0,
          ...bleacher,
          bleacher_type_uuid: bleacherTypeUuid,
        } as any)
        .compile(),
    );
    successToast("Bleacher was Created");
  } catch (e) {
    errorToast(["Error inserting bleacher. Please refresh your page and try again.", String(e)]);
    throw e;
  }
}

export async function updateBleacher(bleacher: UpdateBleacher): Promise<void> {
  try {
    const bleacherTypeUuid = await findOrCreateBleacherType(bleacher.bleacher_rows);
    const { id, ...rest } = bleacher;
    await typedExecute(
      db
        .updateTable("Bleachers")
        .set({ ...rest, bleacher_type_uuid: bleacherTypeUuid } as any)
        .where("id", "=", id)
        .compile(),
    );
    successToast("Bleacher was Updated");
  } catch (e) {
    errorToast(["Error updating bleacher. Please refresh your page and try again.", String(e)]);
    throw e;
  }
}

/** Soft delete / restore a bleacher (PowerSync local write). */
export async function setBleacherDeleted(id: string, deleted: boolean): Promise<void> {
  await typedExecute(
    db
      .updateTable("Bleachers")
      .set({ deleted: deleted ? 1 : 0 } as any)
      .where("id", "=", id)
      .compile(),
  );
}
