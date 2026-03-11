import { Database } from "../../../../database.types";
import { SupabaseClient } from "@supabase/supabase-js";

export type Zone = Database["public"]["Tables"]["Zones"]["Row"];
export type ZoneStateProvince = Database["public"]["Tables"]["ZoneStateProvinces"]["Row"];
export type ZoneQboClass = Database["public"]["Tables"]["ZoneQboClasses"]["Row"];

export type ZoneWithStateProvinces = Zone & {
  state_provinces: ZoneStateProvince[];
  qbo_classes?: ZoneQboClass[];
};
