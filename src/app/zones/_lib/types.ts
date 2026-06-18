import { Database } from "../../../../database.types";

export type Zone = Database["public"]["Tables"]["Zones"]["Row"];
export type ZoneStateProvince = Database["public"]["Tables"]["ZoneStateProvinces"]["Row"];
export type ZoneQboClass = Database["public"]["Tables"]["ZoneQboClasses"]["Row"];
export type AccountManagerZone = Database["public"]["Tables"]["AccountManagerZones"]["Row"];
export type DriverZone = Database["public"]["Tables"]["DriverZones"]["Row"];

export type ZoneWithRelations = Zone & {
  state_provinces: ZoneStateProvince[];
  qbo_classes?: ZoneQboClass[];
  bleacher_uuids: string[];
  account_manager_uuids: string[];
  lead_account_manager_uuids: string[];
  driver_uuids: string[];
};

/** @deprecated Use ZoneWithRelations instead */
export type ZoneWithStateProvinces = ZoneWithRelations;
