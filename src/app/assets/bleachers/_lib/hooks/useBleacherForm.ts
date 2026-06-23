"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import {
  EditBleacherRow,
  insertBleacher,
  updateBleacher,
  useTakenBleacherNumbers,
} from "../db";
import { checkInsertBleacherFormRules, feetAndInchesToInches, inchesToFeetAndInches } from "../functions";

export type BleacherFormState = {
  bleacherNumber: number | null;
  rows: number | null;
  seats: number | null;
  bleacherTypeUuid: string | null;
  storageLocationUuid: string | null;
  zoneUuid: string | null;
  linxupDeviceId: string | null;
  manufacturer: string | null;
  vinNumber: string | null;
  tagNumber: string | null;
  hitchType: string | null;
  trailerHeightFt: number | null;
  trailerHeightIn: number | null;
  trailerLengthFt: number | null;
  trailerLengthIn: number | null;
  openingDirection: "driver" | "passenger" | null;
  gvwr: number | null;
  nvisPdfPath: string | null;
};

const EMPTY_STATE: BleacherFormState = {
  bleacherNumber: null,
  rows: null,
  seats: null,
  bleacherTypeUuid: null,
  storageLocationUuid: null,
  zoneUuid: null,
  linxupDeviceId: null,
  manufacturer: null,
  vinNumber: null,
  tagNumber: null,
  hitchType: null,
  trailerHeightFt: null,
  trailerHeightIn: null,
  trailerLengthFt: null,
  trailerLengthIn: null,
  openingDirection: null,
  gvwr: null,
  nvisPdfPath: null,
};

export type StorageLocationOption = { id: string; name: string | null };

/** Reactive list of (non-deleted) storage locations for the dropdown. */
export function useStorageLocationOptions(): StorageLocationOption[] {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("StorageLocations")
        .select(["id", "name"])
        .where("deleted", "=", 0)
        .orderBy("name", "asc")
        .compile(),
    [],
  );
  const { data } = useTypedQuery(compiled, expect<StorageLocationOption>());
  return data ?? [];
}

function stateFromRow(row: EditBleacherRow): BleacherFormState {
  const h = inchesToFeetAndInches(row.trailer_height_in ?? null);
  const l = inchesToFeetAndInches(row.trailer_length_in ?? null);
  return {
    bleacherNumber: row.bleacher_number,
    rows: row.bleacher_rows,
    seats: row.bleacher_seats,
    bleacherTypeUuid: row.bleacher_type_uuid ?? null,
    storageLocationUuid: row.storage_location_uuid ?? null,
    zoneUuid: row.zone_uuid ?? null,
    linxupDeviceId: row.linxup_device_id ?? null,
    manufacturer: row.manufacturer ?? null,
    vinNumber: row.vin_number ?? null,
    tagNumber: row.tag_number ?? null,
    hitchType: row.hitch_type ?? null,
    trailerHeightFt: h.feet || null,
    trailerHeightIn: h.inches || null,
    trailerLengthFt: l.feet || null,
    trailerLengthIn: l.inches || null,
    openingDirection: (row.opening_direction as "driver" | "passenger" | null) ?? null,
    gvwr: row.gvwr ?? null,
    nvisPdfPath: row.nvis_pdf_path ?? null,
  };
}

/**
 * Shared form state + persistence for the Add/Edit bleacher sheets.
 * All reads/writes go through PowerSync (see docs/POWERSYNC_ARCHITECTURE.md).
 */
export function useBleacherForm(options: {
  /** Editing an existing bleacher hydrates from this row; null = create mode. */
  existing?: EditBleacherRow | null;
  /** Auto-suggest the next number in create mode. */
  autoSuggestNumber?: boolean;
}) {
  const { existing, autoSuggestNumber } = options;
  const [state, setState] = useState<BleacherFormState>(EMPTY_STATE);
  const { numbers: takenNumbers, isLoading } = useTakenBleacherNumbers();

  const setField = useCallback(
    <K extends keyof BleacherFormState>(key: K, value: BleacherFormState[K]) =>
      setState((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const reset = useCallback(() => setState(EMPTY_STATE), []);

  // Hydrate from the existing bleacher when editing.
  useEffect(() => {
    if (existing) setState(stateFromRow(existing));
    else setState(EMPTY_STATE);
  }, [existing]);

  // Suggest the next free number when creating.
  useEffect(() => {
    if (!autoSuggestNumber || existing) return;
    if (!isLoading && takenNumbers.length > 0 && state.bleacherNumber == null) {
      setField("bleacherNumber", Math.max(...takenNumbers) + 1);
    }
  }, [autoSuggestNumber, existing, isLoading, takenNumbers, state.bleacherNumber, setField]);

  // A number collides only with bleachers other than the one being edited.
  const otherNumbers = useMemo(
    () => takenNumbers.filter((n) => n !== existing?.bleacher_number),
    [takenNumbers, existing?.bleacher_number],
  );
  const isTakenNumber =
    state.bleacherNumber != null && otherNumbers.includes(state.bleacherNumber);

  const buildPayload = useCallback(() => {
    if (
      !checkInsertBleacherFormRules(
        {
          bleacher_number: state.bleacherNumber,
          bleacher_rows: state.rows,
          bleacher_seats: state.seats,
        },
        otherNumbers,
      )
    ) {
      return null;
    }
    return {
      bleacher_number: state.bleacherNumber!,
      bleacher_rows: state.rows!,
      bleacher_seats: state.seats!,
      bleacher_type_uuid: state.bleacherTypeUuid,
      storage_location_uuid: state.storageLocationUuid,
      zone_uuid: state.zoneUuid,
      linxup_device_id: state.linxupDeviceId,
      manufacturer: state.manufacturer,
      vin_number: state.vinNumber,
      tag_number: state.tagNumber,
      hitch_type: state.hitchType,
      trailer_height_in: feetAndInchesToInches(state.trailerHeightFt, state.trailerHeightIn),
      trailer_length_in: feetAndInchesToInches(state.trailerLengthFt, state.trailerLengthIn),
      opening_direction: state.openingDirection,
      gvwr: state.gvwr,
      nvis_pdf_path: state.nvisPdfPath,
    };
  }, [state, otherNumbers]);

  /** Validates + persists. Returns true on success, false if validation failed. */
  const save = useCallback(async (): Promise<boolean> => {
    const payload = buildPayload();
    if (!payload) return false;
    if (existing) {
      await updateBleacher({ id: existing.id, ...payload });
    } else {
      await insertBleacher(payload);
    }
    return true;
  }, [buildPayload, existing]);

  return { state, setField, reset, takenNumbers: otherNumbers, isTakenNumber, isLoading, save };
}
