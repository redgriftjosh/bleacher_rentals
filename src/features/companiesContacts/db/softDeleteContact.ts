import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

export async function softDeleteContact(id: string): Promise<void> {
  await typedExecute(
    db.updateTable("Contacts").set({ deleted: 1 }).where("id", "=", id).compile(),
  );
}
