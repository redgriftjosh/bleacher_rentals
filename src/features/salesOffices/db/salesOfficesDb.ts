import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

// ── Types ──

export type SalesOfficeRow = {
  id: string;
  name: string | null;
  address_uuid: string | null;
  quickbook_uuid: string | null;
  deleted: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

export type QboConnectionOption = {
  id: string;
  displayName: string;
};

export type SalesOfficeAddress = {
  street: string;
  city: string;
  stateProvince: string;
  zipPostal: string;
};

export type SalesOfficeInput = {
  name: string;
  quickbookUuid: string;
  address: SalesOfficeAddress | null;
};

// ── Read (PowerSync, non-reactive) ──

export function buildFetchAllSalesOfficesQuery() {
  return db
    .selectFrom("SalesOffices as so")
    .leftJoin("Addresses as a", "so.address_uuid", "a.id")
    .select([
      "so.id as id",
      "so.name as name",
      "so.address_uuid as address_uuid",
      "so.quickbook_uuid as quickbook_uuid",
      "so.deleted as deleted",
      "a.street as address_street",
      "a.city as address_city",
      "a.state_province as address_state",
      "a.zip_postal as address_zip",
    ])
    .where("so.deleted", "=", 0)
    .orderBy("so.name")
    .compile();
}

export async function fetchAllSalesOffices(): Promise<SalesOfficeRow[]> {
  return typedGetAll(buildFetchAllSalesOfficesQuery(), expect<SalesOfficeRow>());
}

// QboConnections is not synced to PowerSync — fetch via Supabase (online).
export async function fetchQboConnections(
  supabase: SupabaseClient<Database>,
): Promise<QboConnectionOption[]> {
  const { data, error } = await supabase
    .from("QboConnections")
    .select("id, display_name")
    .order("display_name");

  if (error) {
    console.error("Failed to fetch QBO connections:", error);
    return [];
  }

  return (data ?? []).map((q) => ({
    id: q.id,
    displayName: q.display_name,
  }));
}

// ── Writes (PowerSync local-first / optimistic) ──

export async function upsertSalesOfficeAddress(
  address: SalesOfficeAddress | null,
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

export async function createSalesOffice(params: SalesOfficeInput): Promise<string> {
  const addressUuid = await upsertSalesOfficeAddress(params.address, null);

  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("SalesOffices")
      .values({
        id,
        name: params.name,
        quickbook_uuid: params.quickbookUuid,
        address_uuid: addressUuid,
        deleted: 0,
      } as any)
      .compile(),
  );

  return id;
}

export async function updateSalesOffice(
  id: string,
  existingAddressUuid: string | null,
  params: SalesOfficeInput,
): Promise<void> {
  const addressUuid = await upsertSalesOfficeAddress(params.address, existingAddressUuid);

  await typedExecute(
    db
      .updateTable("SalesOffices")
      .set({
        name: params.name,
        quickbook_uuid: params.quickbookUuid,
        address_uuid: addressUuid,
      } as any)
      .where("id", "=", id)
      .compile(),
  );
}

export async function softDeleteSalesOffice(id: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("SalesOffices")
      .set({ deleted: 1 } as any)
      .where("id", "=", id)
      .compile(),
  );
}
