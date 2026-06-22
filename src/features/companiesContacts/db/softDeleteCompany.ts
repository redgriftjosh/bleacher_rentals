import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

export async function softDeleteCompany(id: string): Promise<void> {
  await typedExecute(
    db.updateTable("Companies").set({ deleted: 1 }).where("id", "=", id).compile(),
  );
}
