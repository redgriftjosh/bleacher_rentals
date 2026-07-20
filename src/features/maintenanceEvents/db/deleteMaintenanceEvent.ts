import React from "react";
import { toast } from "sonner";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

/**
 * Soft delete or restore a maintenance event via a local-first PowerSync write.
 * Junction rows and damage-report links are left intact so the event can be
 * fully restored. Reactive lists filter on `deleted`, so it disappears from /
 * reappears on the dashboard and Repairs page immediately.
 *
 * `deleted` is stored as an integer (0/1) in the local PowerSync schema.
 */
export async function setMaintenanceEventDeleted(
  maintenanceEventUuid: string,
  deleted: boolean,
): Promise<void> {
  try {
    await typedExecute(
      db
        .updateTable("MaintenanceEvents")
        .set({ deleted: deleted ? 1 : 0 } as any)
        .where("id", "=", maintenanceEventUuid)
        .compile(),
    );
  } catch (e) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [`Failed to ${deleted ? "delete" : "restore"} maintenance event.`, String(e)],
        }),
      { duration: 10000 },
    );
    throw e;
  }

  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: [deleted ? "Maintenance event deleted" : "Maintenance event restored"],
      }),
    { duration: 5000 },
  );
}

export async function deleteMaintenanceEvent(maintenanceEventUuid: string): Promise<void> {
  await setMaintenanceEventDeleted(maintenanceEventUuid, true);
}
