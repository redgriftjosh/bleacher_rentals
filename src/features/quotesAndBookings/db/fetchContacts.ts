import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyUuid: string | null;
};

export async function fetchContacts(
  supabase: SupabaseClient<Database>,
): Promise<ContactOption[]> {
  const { data, error } = await supabase
    .from("Contacts")
    .select("id, first_name, last_name, email, phone, company_uuid")
    .eq("deleted", false)
    .order("first_name");

  if (error) {
    console.error("Failed to fetch contacts:", error);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone,
    companyUuid: c.company_uuid,
  }));
}
