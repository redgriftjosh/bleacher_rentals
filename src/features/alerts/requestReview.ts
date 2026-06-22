import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { syncAlertsForEntity } from "./engine";
import { AlertEntityType } from "./types";

export const REVIEW_REQUESTED_TITLE = "Review Requested";

type RequestReviewParams = {
  entityUuid: string;
  entityType: AlertEntityType;
  bleacherZoneUuid: string;
  message: string;
  entityDescription: string | null;
};

type AmUserRow = { user_uuid: string | null };

export async function requestReview(params: RequestReviewParams): Promise<void> {
  const { entityUuid, entityType, bleacherZoneUuid, message, entityDescription } = params;

  const leadAmRows = await typedGetAll(
    db
      .selectFrom("AccountManagerZones as amz")
      .innerJoin("AccountManagers as am", "am.id", "amz.account_manager_uuid")
      .select(["am.user_uuid as user_uuid"])
      .where("amz.zone_uuid", "=", bleacherZoneUuid)
      .where("amz.is_lead", "=", 1)
      .compile(),
    expect<AmUserRow>(),
  );

  const recipientUuids = leadAmRows
    .map((r) => r.user_uuid)
    .filter((id): id is string => !!id);

  if (recipientUuids.length === 0) return;

  await syncAlertsForEntity(
    REVIEW_REQUESTED_TITLE,
    entityUuid,
    entityType,
    [
      {
        entity_uuid: entityUuid,
        entity_type: entityType,
        title: REVIEW_REQUESTED_TITLE,
        message,
        entity_description: entityDescription,
      },
    ],
    recipientUuids,
  );
}
