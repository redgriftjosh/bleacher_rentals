import React from "react";
import { toast } from "sonner";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { SubrentalEventStore } from "../state/useSubrentalEventStore";

export async function updateSubrentalEvent(state: SubrentalEventStore): Promise<void> {
  if (!state.subrentalEventUuid) {
    throw new Error("No sub-rental event UUID to update");
  }

  if (!state.eventStart || !state.eventEnd) {
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, { id: t, lines: ["Start and end dates are required."] }),
      { duration: 5000 },
    );
    throw new Error("Start and end dates are required");
  }

  if (!state.bleacherUuid) {
    toast.custom(
      (t) => React.createElement(ErrorToast, { id: t, lines: ["A bleacher must be selected."] }),
      { duration: 5000 },
    );
    throw new Error("A bleacher must be selected");
  }

  const compiled = db
    .updateTable("SubrentalEvents")
    .set({
      event_start: state.eventStart,
      event_end: state.eventEnd,
      bleacher_uuid: state.bleacherUuid,
      requested_zone_uuid: state.requestedZoneUuid,
      notes: state.notes || null,
      status: state.status,
      reviewed_by_user_uuid: state.reviewedByUserUuid,
      reviewed_at: state.reviewedAt,
    })
    .where("id", "=", state.subrentalEventUuid)
    .compile();

  await typedExecute(compiled);

  toast.custom(
    (t) => React.createElement(SuccessToast, { id: t, lines: ["Sub-rental request updated"] }),
    { duration: 5000 },
  );
}
