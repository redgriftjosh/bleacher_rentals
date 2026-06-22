import React from "react";
import { toast } from "sonner";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";

export async function deleteSubrentalEvent(subrentalEventUuid: string): Promise<void> {
  const compiled = db.deleteFrom("SubrentalEvents").where("id", "=", subrentalEventUuid).compile();

  try {
    await typedExecute(compiled);
  } catch (err: any) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Failed to delete sub-rental request.", err?.message ?? ""],
        }),
      { duration: 10000 },
    );
    throw err;
  }

  toast.custom(
    (t) => React.createElement(SuccessToast, { id: t, lines: ["Sub-rental request deleted"] }),
    { duration: 5000 },
  );
}
