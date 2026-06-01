import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type SalesOfficeOption = {
  id: string;
  name: string;
};

export async function fetchSalesOffices(
  supabase: SupabaseClient<Database>,
): Promise<SalesOfficeOption[]> {
  const { data, error } = await supabase
    .from("SalesOffices")
    .select("id, name")
    .eq("deleted", false)
    .order("name");

  if (error) {
    console.error("Failed to fetch sales offices:", error);
    return [];
  }

  return (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
  }));
}
