import React from "react";
import { toast } from "sonner";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { SubrentalEventStore } from "../state/useSubrentalEventStore";

export async function createSubrentalEvent(state: SubrentalEventStore): Promise<void> {
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

  const id = crypto.randomUUID();
  const compiled = db
    .insertInto("SubrentalEvents")
    .values({
      id,
      created_at: new Date().toISOString(),
      event_start: state.eventStart,
      event_end: state.eventEnd,
      bleacher_uuid: state.bleacherUuid,
      requested_zone_uuid: state.requestedZoneUuid,
      notes: state.notes || null,
      status: "pending",
      created_by_user_uuid: state.createdByUserUuid,
      reviewed_by_user_uuid: null,
      reviewed_at: null,
    })
    .compile();

  await typedExecute(compiled);

  toast.custom(
    (t) => React.createElement(SuccessToast, { id: t, lines: ["Sub-rental request created"] }),
    { duration: 5000 },
  );
}
