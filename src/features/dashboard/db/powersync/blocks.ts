import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import type { EditBlock } from "../../types";

/**
 * Save a block using PowerSync local writes.
 *
 * - UPDATE when blockUuid exists, INSERT otherwise.
 * - No Supabase client needed — writes go to PowerSync's local SQLite
 *   and sync upstream automatically.
 * - No updateDataBase() / Pusher call — PowerSync's sync stream
 *   notifies other clients.
 */
export async function saveBlockPowerSync(block: EditBlock | null): Promise<void> {
  if (!block) {
    console.error("No block provided for save");
    createErrorToast(["No block provided for save"]);
    throw new Error("No block selected to save.");
  }

  try {
    if (block.blockUuid) {
      // ── UPDATE existing block ──
      const compiled = db
        .updateTable("Blocks")
        .set({ text: block.text })
        .where("id", "=", block.blockUuid)
        .compile();

      await typedExecute(compiled);
    } else {
      // ── INSERT new block ──
      const compiled = db
        .insertInto("Blocks")
        .values({
          id: crypto.randomUUID(),
          bleacher_uuid: block.bleacherUuid,
          date: block.date,
          text: block.text,
        })
        .compile();

      await typedExecute(compiled);
    }

    createSuccessToast(["Block saved"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to save block:", error);
    createErrorToast(["Failed to save block", message]);
    throw error;
  }
}

/**
 * Delete a block using PowerSync local writes.
 */
export async function deleteBlockPowerSync(block: EditBlock | null): Promise<void> {
  if (!block) {
    console.error("No block provided for delete");
    createErrorToast(["No block provided for delete"]);
    throw new Error("No block selected to delete.");
  }

  if (!block.blockUuid) {
    console.error("No Block ID provided for delete.");
    createErrorToast(["Failed to delete block, no block ID provided."]);
    throw new Error("No Block ID provided for delete.");
  }

  try {
    const compiled = db
      .deleteFrom("Blocks")
      .where("id", "=", block.blockUuid)
      .compile();

    await typedExecute(compiled);

    createSuccessToast(["Block Deleted"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to delete block:", error);
    createErrorToast(["Failed to delete block", message]);
    throw error;
  }
}
