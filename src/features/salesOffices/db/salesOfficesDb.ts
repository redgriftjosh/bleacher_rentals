import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { db, powerSyncDb } from "@/components/providers/SystemProvider";
import { createErrorToast } from "@/components/toasts/ErrorToast";

// ── Types ──

export type SalesOfficeRow = {
  id: string;
  name: string;
  address_uuid: string | null;
  quickbook_uuid: string;
  deleted: number;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  qbo_display_name: string | null;
};

export type QboConnectionOption = {
  id: string;
  displayName: string;
};

// ── Read (PowerSync) ──

export async function fetchAllSalesOffices(): Promise<SalesOfficeRow[]> {
  const compiled = db
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
    ])
    .where("so.deleted", "=", 0)
    .orderBy("so.name")
    .compile();

  return powerSyncDb.getAll<SalesOfficeRow>(compiled.sql, compiled.parameters as any[]);
}

// QboConnections not in PowerSync — fetch via Supabase
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

// ── Write (Supabase) ──

type CreateSalesOfficeParams = {
  name: string;
  quickbookUuid: string;
  address?: {
    street: string;
    city: string;
    stateProvince: string;
    zipPostal: string;
  } | null;
};

export async function createSalesOffice(
  params: CreateSalesOfficeParams,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  // 1. Insert address if provided
  let addressUuid: string | null = null;

  if (params.address && params.address.street) {
    const { data, error } = await supabase
      .from("Addresses")
      .insert({
        street: params.address.street,
        city: params.address.city,
        state_province: params.address.stateProvince,
        zip_postal: params.address.zipPostal || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      createErrorToast(["Failed to insert address.", error?.message ?? ""]);
    }
    addressUuid = data!.id;
  }

  // 2. Insert sales office
  const newOffice: TablesInsert<"SalesOffices"> = {
    name: params.name,
    quickbook_uuid: params.quickbookUuid,
    address_uuid: addressUuid,
  };

  const { data, error } = await supabase
    .from("SalesOffices")
    .insert(newOffice)
    .select("id")
    .single();

  if (error || !data) {
    createErrorToast(["Failed to create sales office.", error?.message ?? ""]);
  }

  return data!.id;
}

export async function softDeleteSalesOffice(
  officeId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from("SalesOffices")
    .update({ deleted: true })
    .eq("id", officeId);

  if (error) {
    createErrorToast(["Failed to delete sales office.", error.message ?? ""]);
  }
}
