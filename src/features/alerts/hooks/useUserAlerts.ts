"use client";
import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery, typedExecute } from "@/lib/powersync/typedQuery";

export type UserAlertRow = {
  userAlertId: string;
  alertId: string;
  entityUuid: string | null;
  entityType: string | null;
  entityDescription: string | null;
  title: string | null;
  message: string | null;
  dismissed: number | null;
  dismissedUntil: string | null;
  createdAt: string | null;
};

// ─── user lookup ─────────────────────────────────────────────────────────────

type UserRow = { userUuid: string };

export function useUserAlerts() {
  const { user } = useUser();
  const clerkUserId = user?.id ?? "__no_clerk_user__";
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 1. Resolve Users.id from clerk id
  const userQuery = useMemo(
    () =>
      db
        .selectFrom("Users as u")
        .select(["u.id as userUuid"])
        .where("u.clerk_user_id", "=", clerkUserId)
        .limit(1)
        .compile(),
    [clerkUserId],
  );

  const { data: userData } = useTypedQuery(userQuery, expect<UserRow>());
  const userUuid = userData?.[0]?.userUuid ?? "__no_user__";

  // 2. All UserAlerts + joined Alert for this user, ordered by reminder then created
  const alertsQuery = useMemo(
    () =>
      db
        .selectFrom("UserAlerts as ua")
        .innerJoin("Alerts as a", "a.id", "ua.alert_uuid")
        .select([
          "ua.id as userAlertId",
          "a.id as alertId",
          "a.entity_uuid as entityUuid",
          "a.entity_type as entityType",
          "a.entity_description as entityDescription",
          "a.title as title",
          "a.message as message",
          "ua.dismissed as dismissed",
          "ua.dismissed_until as dismissedUntil",
          "ua.created_at as createdAt",
        ])
        .where("ua.user_uuid", "=", userUuid)
        .orderBy("ua.dismissed_until", "asc")
        .orderBy("ua.created_at", "desc")
        .compile(),
    [userUuid],
  );

  const { data: allAlerts = [] } = useTypedQuery(alertsQuery, expect<UserAlertRow>());

  // "Active" = not dismissed, or reminder date has arrived
  const activeAlerts = allAlerts.filter(
    (a) => !a.dismissed || (a.dismissedUntil !== null && a.dismissedUntil <= today),
  );

  // "Dismissed" = dismissed=1 AND (dismissed_until IS NULL OR dismissed_until > today)
  const dismissedAlerts = allAlerts.filter(
    (a) => !!a.dismissed && (a.dismissedUntil === null || a.dismissedUntil > today),
  );

  const activeCount = activeAlerts.length;

  async function dismiss(userAlertId: string) {
    const compiled = db
      .updateTable("UserAlerts")
      .set({ dismissed: 1, dismissed_until: null } as any)
      .where("id", "=", userAlertId)
      .compile();
    await typedExecute(compiled);
  }

  async function remindLater(userAlertId: string, date: string) {
    const compiled = db
      .updateTable("UserAlerts")
      .set({ dismissed: 1, dismissed_until: date } as any)
      .where("id", "=", userAlertId)
      .compile();
    await typedExecute(compiled);
  }

  async function undismiss(userAlertId: string) {
    const compiled = db
      .updateTable("UserAlerts")
      .set({ dismissed: 0, dismissed_until: null } as any)
      .where("id", "=", userAlertId)
      .compile();
    await typedExecute(compiled);
  }

  return { activeAlerts, dismissedAlerts, activeCount, dismiss, remindLater, undismiss };
}
