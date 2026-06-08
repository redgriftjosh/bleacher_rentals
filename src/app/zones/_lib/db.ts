import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { ZoneWithRelations } from "./types";

export async function fetchZones(
  supabase: SupabaseClient<Database>,
): Promise<ZoneWithRelations[]> {
  const { data, error } = await supabase
    .from("Zones")
    .select(
      `*,
      state_provinces:ZoneStateProvinces(*),
      qbo_classes:ZoneQboClasses(*),
      bleachers:Bleachers!Bleachers_zone_uuid_fkey(id),
      account_managers:AccountManagerZones(account_manager_uuid),
      drivers:DriverZones(driver_uuid)`,
    )
    .order("display_name");

  if (error) throw new Error(error.message);

  return (data as any[]).map((zone) => ({
    ...zone,
    bleacher_uuids: (zone.bleachers || []).map((b: any) => b.id),
    account_manager_uuids: (zone.account_managers || []).map((am: any) => am.account_manager_uuid),
    driver_uuids: (zone.drivers || []).map((d: any) => d.driver_uuid),
    bleachers: undefined,
    account_managers: undefined,
    drivers: undefined,
  }));
}

export async function fetchZoneById(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<ZoneWithRelations> {
  const { data, error } = await supabase
    .from("Zones")
    .select(
      `*,
      state_provinces:ZoneStateProvinces(*),
      qbo_classes:ZoneQboClasses(*),
      bleachers:Bleachers!Bleachers_zone_uuid_fkey(id),
      account_managers:AccountManagerZones(account_manager_uuid),
      drivers:DriverZones(driver_uuid)`,
    )
    .eq("id", zoneId)
    .single();

  if (error) throw new Error(error.message);

  const zone = data as any;
  return {
    ...zone,
    bleacher_uuids: (zone.bleachers || []).map((b: any) => b.id),
    account_manager_uuids: (zone.account_managers || []).map((am: any) => am.account_manager_uuid),
    driver_uuids: (zone.drivers || []).map((d: any) => d.driver_uuid),
    bleachers: undefined,
    account_managers: undefined,
    drivers: undefined,
  };
}

export async function createZone(
  supabase: SupabaseClient<Database>,
  displayName: string,
  description: string | null,
  stateProvinces: string[],
  qboClassMappings: { connectionId: string; classId: string }[],
  bleacherUuids: string[],
  accountManagerUuids: string[],
  driverUuids: string[],
): Promise<string> {
  const { data: zone, error: zoneError } = await supabase
    .from("Zones")
    .insert({ display_name: displayName, description })
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

  if (qboClassMappings.length > 0) {
    const qboRows = qboClassMappings.map((m) => ({
      zone_uuid: zone.id,
      qbo_connection_uuid: m.connectionId,
      qbo_class_id: m.classId,
    }));
    const { error: qboError } = await supabase.from("ZoneQboClasses").insert(qboRows);
    if (qboError) throw new Error(qboError.message);
  }

  if (bleacherUuids.length > 0) {
    const { error: bError } = await supabase
      .from("Bleachers")
      .update({ zone_uuid: zone.id })
      .in("id", bleacherUuids);
    if (bError) throw new Error(bError.message);
  }

  if (accountManagerUuids.length > 0) {
    const amRows = accountManagerUuids.map((amUuid) => ({
      account_manager_uuid: amUuid,
      zone_uuid: zone.id,
    }));
    const { error: amError } = await supabase.from("AccountManagerZones").insert(amRows);
    if (amError) throw new Error(amError.message);
  }

  if (driverUuids.length > 0) {
    const dRows = driverUuids.map((dUuid) => ({
      driver_uuid: dUuid,
      zone_uuid: zone.id,
    }));
    const { error: dError } = await supabase.from("DriverZones").insert(dRows);
    if (dError) throw new Error(dError.message);
  }

  return zone.id;
}

export async function updateZone(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  displayName: string,
  description: string | null,
  stateProvinces: string[],
  qboClassMappings: { connectionId: string; classId: string }[],
  bleacherUuids: string[],
  accountManagerUuids: string[],
  driverUuids: string[],
): Promise<void> {
  const { error: zoneError } = await supabase
    .from("Zones")
    .update({ display_name: displayName, description })
    .eq("id", zoneId);

  if (zoneError) throw new Error(zoneError.message);

  // State provinces: delete + re-insert
  const { error: deleteSpError } = await supabase
    .from("ZoneStateProvinces")
    .delete()
    .eq("zone_uuid", zoneId);
  if (deleteSpError) throw new Error(deleteSpError.message);

  if (stateProvinces.length > 0) {
    const rows = stateProvinces.map((sp) => ({
      zone_uuid: zoneId,
      state_province: sp,
    }));
    const { error: spError } = await supabase.from("ZoneStateProvinces").insert(rows);
    if (spError) throw new Error(spError.message);
  }

  // QBO classes: delete + re-insert
  const { error: deleteQboError } = await supabase
    .from("ZoneQboClasses")
    .delete()
    .eq("zone_uuid", zoneId);
  if (deleteQboError) throw new Error(deleteQboError.message);

  if (qboClassMappings.length > 0) {
    const qboRows = qboClassMappings.map((m) => ({
      zone_uuid: zoneId,
      qbo_connection_uuid: m.connectionId,
      qbo_class_id: m.classId,
    }));
    const { error: qboError } = await supabase.from("ZoneQboClasses").insert(qboRows);
    if (qboError) throw new Error(qboError.message);
  }

  // Bleachers: unset old, set new
  const { error: unsetBError } = await supabase
    .from("Bleachers")
    .update({ zone_uuid: null })
    .eq("zone_uuid", zoneId);
  if (unsetBError) throw new Error(unsetBError.message);

  if (bleacherUuids.length > 0) {
    const { error: setBError } = await supabase
      .from("Bleachers")
      .update({ zone_uuid: zoneId })
      .in("id", bleacherUuids);
    if (setBError) throw new Error(setBError.message);
  }

  // AccountManagerZones: delete + re-insert
  const { error: deleteAmError } = await supabase
    .from("AccountManagerZones")
    .delete()
    .eq("zone_uuid", zoneId);
  if (deleteAmError) throw new Error(deleteAmError.message);

  if (accountManagerUuids.length > 0) {
    const amRows = accountManagerUuids.map((amUuid) => ({
      account_manager_uuid: amUuid,
      zone_uuid: zoneId,
    }));
    const { error: amError } = await supabase.from("AccountManagerZones").insert(amRows);
    if (amError) throw new Error(amError.message);
  }

  // DriverZones: delete + re-insert
  const { error: deleteDError } = await supabase
    .from("DriverZones")
    .delete()
    .eq("zone_uuid", zoneId);
  if (deleteDError) throw new Error(deleteDError.message);

  if (driverUuids.length > 0) {
    const dRows = driverUuids.map((dUuid) => ({
      driver_uuid: dUuid,
      zone_uuid: zoneId,
    }));
    const { error: dError } = await supabase.from("DriverZones").insert(dRows);
    if (dError) throw new Error(dError.message);
  }
}

export async function uploadZonePhoto(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  blob: Blob,
  oldPhotoPath?: string | null,
): Promise<string> {
  const fileName = `${zoneId}_${Date.now()}.png`;

  if (oldPhotoPath) {
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
