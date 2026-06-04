import { SupabaseClient } from "@supabase/supabase-js";
import { Database, TablesInsert } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";

type CreateContactParams = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  companyUuid: string | null;
};

export async function createContact(
  params: CreateContactParams,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const newContact: TablesInsert<"Contacts"> = {
    first_name: params.firstName,
    last_name: params.lastName || null,
    phone: params.phone || null,
    email: params.email || null,
    notes: params.notes || null,
    company_uuid: params.companyUuid,
  };

  const { data, error } = await supabase
    .from("Contacts")
    .insert(newContact)
    .select("id")
    .single();

  if (error || !data) {
    createErrorToast(["Failed to create contact.", error?.message ?? ""]);
  }

  return data!.id;
}
