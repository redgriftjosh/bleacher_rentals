import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

type CreateContactParams = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  companyUuid: string | null;
};

export async function createContact(params: CreateContactParams): Promise<string> {
  const id = crypto.randomUUID();

  await typedExecute(
    db
      .insertInto("Contacts")
      .values({
        id,
        first_name: params.firstName,
        last_name: params.lastName || null,
        phone: params.phone || null,
        email: params.email || null,
        notes: params.notes || null,
        company_uuid: params.companyUuid,
        deleted: 0,
      })
      .compile(),
  );

  return id;
}
