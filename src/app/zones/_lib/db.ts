import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { ZoneWithStateProvinces } from "./types";

export async function fetchZones(
  supabase: SupabaseClient<Database>,
): Promise<ZoneWithStateProvinces[]> {
  const { data, error } = await supabase
    .from("Zones")
    .select("*, state_provinces:ZoneStateProvinces(*)")
    .order("display_name");

  if (error) throw new Error(error.message);
  return data as ZoneWithStateProvinces[];
}

export async function fetchZoneById(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<ZoneWithStateProvinces> {
  const { data, error } = await supabase
    .from("Zones")
    .select("*, state_provinces:ZoneStateProvinces(*)")
    .eq("id", zoneId)
    .single();

  if (error) throw new Error(error.message);
  return data as ZoneWithStateProvinces;
}

export async function createZone(
  supabase: SupabaseClient<Database>,
  displayName: string,
  description: string | null,
  stateProvinces: string[],
  qboClassId: string | null,
): Promise<string> {
  const { data: zone, error: zoneError } = await supabase
    .from("Zones")
    .insert({ display_name: displayName, description, qbo_class_id: qboClassId })
    .select("id")
    .single();

  if (zoneError) throw new Error(zoneError.message);

  if (stateProvinces.length > 0) {
    const rows = stateProvinces.map((sp) => ({
      zone_uuid: zone.id,
      state_province: sp,
    }));

    const { error: spError } = await supabase.from("ZoneStateProvinces").insert(rows);

    if (spError) throw new Error(spError.message);
  }

  return zone.id;
}

export async function updateZone(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  displayName: string,
  description: string | null,
  stateProvinces: string[],
  qboClassId: string | null,
): Promise<void> {
  const { error: zoneError } = await supabase
    .from("Zones")
    .update({ display_name: displayName, description, qbo_class_id: qboClassId })
    .eq("id", zoneId);

  if (zoneError) throw new Error(zoneError.message);

  // Delete existing state/provinces and re-insert
  const { error: deleteError } = await supabase
    .from("ZoneStateProvinces")
    .delete()
    .eq("zone_uuid", zoneId);

  if (deleteError) throw new Error(deleteError.message);

  if (stateProvinces.length > 0) {
    const rows = stateProvinces.map((sp) => ({
      zone_uuid: zoneId,
      state_province: sp,
    }));

    const { error: spError } = await supabase.from("ZoneStateProvinces").insert(rows);

    if (spError) throw new Error(spError.message);
  }
}

export async function uploadZonePhoto(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  blob: Blob,
  oldPhotoPath?: string | null,
): Promise<string> {
  // Use timestamped filename so the URL changes (busts browser cache)
  const fileName = `${zoneId}_${Date.now()}.png`;

  // Delete the old file from storage if it exists
  if (oldPhotoPath) {
    // Extract the storage path from the full public URL
    // URL looks like: .../storage/v1/object/public/zone-photos/FILE_NAME
    const match = oldPhotoPath.match(/zone-photos\/(.+)$/);
    if (match) {
      await supabase.storage.from("zone-photos").remove([match[1]]);
    }
  }

  const { error } = await supabase.storage.from("zone-photos").upload(fileName, blob, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("zone-photos").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("Zones")
    .update({ photo_path: publicUrl })
    .eq("id", zoneId);

  if (updateError) throw new Error(updateError.message);

  return publicUrl;
}
