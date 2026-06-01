import { db, powerSyncDb } from "@/components/providers/SystemProvider";

export type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyUuid: string | null;
};

export async function fetchContacts(): Promise<ContactOption[]> {
  const compiled = db
    .selectFrom("Contacts")
    .select(["id", "first_name", "last_name", "email", "phone", "company_uuid"])
    .where("deleted", "=", 0)
    .orderBy("first_name")
    .compile();

  const rows = await powerSyncDb.getAll<{
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company_uuid: string | null;
  }>(compiled.sql, compiled.parameters as any[]);

  return rows.map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone,
    companyUuid: c.company_uuid,
  }));
}
