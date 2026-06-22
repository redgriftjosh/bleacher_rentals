import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

type UpdateCompanyParams = {
  companyName: string;
  email: string;
  phone: string;
  notes: string;
};

export async function updateCompany(id: string, params: UpdateCompanyParams): Promise<void> {
  await typedExecute(
    db
      .updateTable("Companies")
      .set({
        company_name: params.companyName,
        email: params.email || null,
        phone: params.phone || null,
        notes: params.notes || null,
      })
      .where("id", "=", id)
      .compile(),
  );
}
