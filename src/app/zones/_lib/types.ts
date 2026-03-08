import { Database } from "../../../../database.types";
import { SupabaseClient } from "@supabase/supabase-js";

export type Zone = Database["public"]["Tables"]["Zones"]["Row"];
export type ZoneStateProvince = Database["public"]["Tables"]["ZoneStateProvinces"]["Row"];

export type ZoneWithStateProvinces = Zone & {
  state_provinces: ZoneStateProvince[];
};
