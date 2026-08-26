import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role helper for the contacts access specs. Runs in the Node side of
 * the test, never the browser — used to read back what the UI actually wrote and
 * to clean up afterwards.
 */
function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "contacts e2e helper needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SeededContact = { id: string; lastName: string };

/** A contact for the viewer to try to edit. */
export async function seedContact(preferredLanguage: "english" | "french" = "english") {
  const lastName = `Preflight ${Date.now()}`;
  const { data, error } = await admin()
    .from("Contacts")
    .insert({
      first_name: "E2E",
      last_name: lastName,
      email: "preflight@example.com",
      preferred_language: preferredLanguage,
      deleted: false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seedContact failed: ${error?.message}`);
  return { id: data.id as string, lastName } satisfies SeededContact;
}

/** Read a contact by the name shown in the table's first column. */
export async function readContactByName(fullName: string) {
  const [first, ...rest] = fullName.split(" ");
  const { data } = await admin()
    .from("Contacts")
    .select("id, first_name, last_name, preferred_language")
    .eq("first_name", first)
    .eq("last_name", rest.join(" ") || "")
    .maybeSingle();
  return data;
}

/** What is actually stored — the proof a write went through. */
export async function readContact(id: string) {
  const { data } = await admin()
    .from("Contacts")
    .select("first_name, last_name, preferred_language, deleted")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Find a contact the UI created, by the last name typed into the form. */
export async function findContactByLastName(lastName: string) {
  const { data } = await admin()
    .from("Contacts")
    .select("id, last_name, preferred_language")
    .eq("last_name", lastName)
    .maybeSingle();
  return data;
}

export async function deleteContacts(lastNamePrefix: string) {
  await admin().from("Contacts").delete().like("last_name", `${lastNamePrefix}%`);
}
