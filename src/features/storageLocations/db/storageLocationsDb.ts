import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

// ── Types ──

export type StorageLocationRow = {
  id: string;
  name: string | null;
  address_uuid: string | null;
  contact_phone_number: string | null;
  gate_code: string | null;
  notes: string | null;
  deleted: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

export type StorageLocationAddress = {
  street: string;
  city: string;
  stateProvince: string;
  zipPostal: string;
};

export type StorageLocationInput = {
  name: string;
  contactPhoneNumber: string | null;
  gateCode: string | null;
  notes: string | null;
  address: StorageLocationAddress | null;
};

// ── Read (PowerSync, non-reactive) ──

export function buildFetchAllStorageLocationsQuery() {
  return db
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
    .where("sl.deleted", "=", 0)
    .orderBy("sl.name")
    .compile();
}

export async function fetchAllStorageLocations(): Promise<StorageLocationRow[]> {
  return typedGetAll(buildFetchAllStorageLocationsQuery(), expect<StorageLocationRow>());
}

// ── Writes (PowerSync local-first) ──

/**
 * Upserts the address row for a storage location into the local PowerSync DB.
 * Returns the address uuid (existing or newly created), or null when there is
 * no street to store.
 */
export async function upsertStorageLocationAddress(
  address: StorageLocationAddress | null,
  existingAddressUuid: string | null,
): Promise<string | null> {
  if (!address || !address.street) return existingAddressUuid ?? null;

  const values = {
    street: address.street,
    city: address.city,
    state_province: address.stateProvince,
    zip_postal: address.zipPostal || null,
  };

  if (existingAddressUuid) {
    await typedExecute(
      db
        .updateTable("Addresses")
        .set(values as any)
        .where("id", "=", existingAddressUuid)
        .compile(),
    );
    return existingAddressUuid;
  }

  const addressUuid = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("Addresses")
      .values({ id: addressUuid, ...values } as any)
      .compile(),
  );
  return addressUuid;
}

export async function createStorageLocation(params: StorageLocationInput): Promise<string> {
  const addressUuid = await upsertStorageLocationAddress(params.address, null);

  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("StorageLocations")
      .values({
        id,
        name: params.name,
        address_uuid: addressUuid,
        contact_phone_number: params.contactPhoneNumber,
        gate_code: params.gateCode,
        notes: params.notes,
        deleted: 0,
      } as any)
      .compile(),
  );

  return id;
}

export async function updateStorageLocation(
  id: string,
  existingAddressUuid: string | null,
  params: StorageLocationInput,
): Promise<void> {
  const addressUuid = await upsertStorageLocationAddress(params.address, existingAddressUuid);

  await typedExecute(
    db
      .updateTable("StorageLocations")
      .set({
        name: params.name,
        address_uuid: addressUuid,
        contact_phone_number: params.contactPhoneNumber,
        gate_code: params.gateCode,
        notes: params.notes,
      } as any)
      .where("id", "=", id)
      .compile(),
  );
}

export async function softDeleteStorageLocation(id: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("StorageLocations")
      .set({ deleted: 1 } as any)
      .where("id", "=", id)
      .compile(),
  );
}

export async function restoreStorageLocation(id: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("StorageLocations")
      .set({ deleted: 0 } as any)
      .where("id", "=", id)
      .compile(),
  );
}
