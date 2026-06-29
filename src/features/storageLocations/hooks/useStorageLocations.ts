"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import type { StorageLocationRow } from "../db/storageLocationsDb";

/**
 * Reactive, local-first list of storage locations. Updates automatically when
 * the local PowerSync DB changes (create / edit / delete / restore), so callers
 * never need to manually re-fetch.
 */
export function useStorageLocations(params: {
  showDeleted: boolean;
}): {
  locations: StorageLocationRow[];
  isLoading: boolean;
} {
  const { showDeleted } = params;

  const compiled = useMemo(
    () =>
      db
        .selectFrom("StorageLocations as sl")
        .leftJoin("Addresses as a", "sl.address_uuid", "a.id")
        .select([
          "sl.id as id",
          "sl.name as name",
          "sl.address_uuid as address_uuid",
          "sl.contact_phone_number as contact_phone_number",
          "sl.gate_code as gate_code",
          "sl.notes as notes",
          "sl.deleted as deleted",
          "a.street as address_street",
          "a.city as address_city",
          "a.state_province as address_state",
          "a.zip_postal as address_zip",
        ])
        .where("sl.deleted", "=", showDeleted ? 1 : 0)
        .orderBy("sl.name")
        .compile(),
    [showDeleted],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<StorageLocationRow>());
  return { locations: data ?? [], isLoading };
}
