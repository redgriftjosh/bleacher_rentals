import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

type UpdateContactParams = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  companyUuid: string | null;
};

export async function updateContact(id: string, params: UpdateContactParams): Promise<void> {
  await typedExecute(
    db
      .updateTable("Contacts")
      .set({
        first_name: params.firstName,
        last_name: params.lastName || null,
        email: params.email || null,
        phone: params.phone || null,
        notes: params.notes || null,
        company_uuid: params.companyUuid,
      })
      .where("id", "=", id)
      .compile(),
  );
}
