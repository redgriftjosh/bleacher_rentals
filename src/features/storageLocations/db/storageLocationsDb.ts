import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { db, powerSyncDb } from "@/components/providers/SystemProvider";
import { createErrorToast } from "@/components/toasts/ErrorToast";

// ── Types ──

export type StorageLocationRow = {
  id: string;
  name: string;
  address_uuid: string | null;
  contact_phone_number: string | null;
  gate_code: string | null;
  notes: string | null;
  deleted: number;
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

// ── Read (PowerSync) ──

export async function fetchAllStorageLocations(): Promise<StorageLocationRow[]> {
  const compiled = db
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

  return powerSyncDb.getAll<StorageLocationRow>(compiled.sql, compiled.parameters as any[]);
}

// ── Write (Supabase) ──

type StorageLocationInput = {
  name: string;
  contactPhoneNumber: string | null;
  gateCode: string | null;
  notes: string | null;
  address: StorageLocationAddress | null;
};

async function upsertAddress(
  address: StorageLocationAddress | null,
  existingAddressUuid: string | null,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  if (!address || !address.street) return existingAddressUuid ?? null;

  const payload = {
    street: address.street,
    city: address.city,
    state_province: address.stateProvince,
    zip_postal: address.zipPostal || null,
  };

  if (existingAddressUuid) {
    const { error } = await supabase
      .from("Addresses")
      .update(payload)
      .eq("id", existingAddressUuid);
    if (error) createErrorToast(["Failed to update address.", error.message ?? ""]);
    return existingAddressUuid;
  }

  const { data, error } = await supabase
    .from("Addresses")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) {
    createErrorToast(["Failed to insert address.", error?.message ?? ""]);
    return null;
  }
  return data.id;
}

export async function createStorageLocation(
  params: StorageLocationInput,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const addressUuid = await upsertAddress(params.address, null, supabase);

  const newRow: TablesInsert<"StorageLocations"> = {
    name: params.name,
    address_uuid: addressUuid,
    contact_phone_number: params.contactPhoneNumber,
    gate_code: params.gateCode,
    notes: params.notes,
  };

  const { data, error } = await supabase
    .from("StorageLocations")
    .insert(newRow)
    .select("id")
    .single();

  if (error || !data) {
    createErrorToast(["Failed to create storage location.", error?.message ?? ""]);
    throw error;
  }

  return data.id;
}

export async function updateStorageLocation(
  id: string,
  existingAddressUuid: string | null,
  params: StorageLocationInput,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const addressUuid = await upsertAddress(params.address, existingAddressUuid, supabase);

  const { error } = await supabase
    .from("StorageLocations")
    .update({
      name: params.name,
      address_uuid: addressUuid,
      contact_phone_number: params.contactPhoneNumber,
      gate_code: params.gateCode,
      notes: params.notes,
    })
    .eq("id", id);

  if (error) {
    createErrorToast(["Failed to update storage location.", error.message ?? ""]);
    throw error;
  }
}

export async function softDeleteStorageLocation(
  id: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from("StorageLocations")
    .update({ deleted: true })
    .eq("id", id);

  if (error) {
    createErrorToast(["Failed to delete storage location.", error.message ?? ""]);
    throw error;
  }
}
