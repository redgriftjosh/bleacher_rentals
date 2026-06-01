import { db, powerSyncDb } from "@/components/providers/SystemProvider";

export type SalesOfficeOption = {
  id: string;
  name: string;
};

export async function fetchSalesOffices(): Promise<SalesOfficeOption[]> {
  const compiled = db
    .selectFrom("SalesOffices")
    .select(["id", "name"])
    .where("deleted", "=", 0)
    .orderBy("name")
    .compile();

  const rows = await powerSyncDb.getAll<{ id: string; name: string }>(
    compiled.sql,
    compiled.parameters as any[],
  );

  return rows.map((o) => ({
    id: o.id,
    name: o.name,
  }));
}
