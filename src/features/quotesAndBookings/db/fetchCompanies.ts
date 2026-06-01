import { db, powerSyncDb } from "@/components/providers/SystemProvider";

export type CompanyOption = {
  id: string;
  companyName: string;
};

export async function fetchCompanies(): Promise<CompanyOption[]> {
  const compiled = db
    .selectFrom("Companies")
    .select(["id", "company_name"])
    .where("deleted", "=", 0)
    .orderBy("company_name")
    .compile();

  const rows = await powerSyncDb.getAll<{ id: string; company_name: string }>(
    compiled.sql,
    compiled.parameters as any[],
  );

  return rows.map((c) => ({
    id: c.id,
    companyName: c.company_name,
  }));
}
