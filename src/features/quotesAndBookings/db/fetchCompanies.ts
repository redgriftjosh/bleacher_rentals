import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type CompanyOption = {
  id: string;
  companyName: string;
};

export async function fetchCompanies(
  supabase: SupabaseClient<Database>,
): Promise<CompanyOption[]> {
  const { data, error } = await supabase
    .from("Companies")
    .select("id, company_name")
    .eq("deleted", false)
    .order("company_name");

  if (error) {
    console.error("Failed to fetch companies:", error);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    companyName: c.company_name,
  }));
}
