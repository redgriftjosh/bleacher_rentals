import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

/**
 * Stamp the current user as having seen every release up to now.
 *
 * Idempotent — safe to call on every mount of /changelog. Writes to the local
 * PowerSync DB, so it clears the indicator immediately and syncs on reconnect.
 */
export async function markChangelogRead(userUuid: string): Promise<void> {
  const compiled = db
    .updateTable("Users")
    .set({ changelog_last_read_at: new Date().toISOString() })
    .where("id", "=", userUuid)
    .compile();

  await typedExecute(compiled);
}
