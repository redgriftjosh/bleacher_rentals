"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery, typedExecute } from "@/lib/powersync/typedQuery";
import { useUser } from "@clerk/nextjs";
import { useMemo } from "react";
import { STATUSES } from "@/features/manageTeam/constants";

type DriverRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  isActive: number | null;
  accountManagerUuid: string | null;
};

type UnavailabilityRow = {
  id: string;
  driverUuid: string | null;
  dateUnavailable: string | null;
};

type CurrentUserRow = {
  userUuid: string;
  isAdmin: number | null;
  accountManagerUuid: string | null;
};

export function useCurrentUserContext() {
  const { user } = useUser();
  const clerkUserId = user?.id ?? "__no_clerk_user__";

  const compiled = useMemo(() => {
    return db
      .selectFrom("Users as u")
      .leftJoin("AccountManagers as am", (join) =>
        join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1),
      )
      .select(["u.id as userUuid", "u.is_admin as isAdmin", "am.id as accountManagerUuid"])
      .where("u.clerk_user_id", "=", clerkUserId)
      .limit(1)
      .compile();
  }, [clerkUserId]);

  const { data } = useTypedQuery(compiled, expect<CurrentUserRow>());
  const row = data?.[0] ?? null;

  return row
    ? {
        userUuid: row.userUuid,
        isAdmin: Boolean(row.isAdmin),
        isAccountManager: !!row.accountManagerUuid,
        accountManagerUuid: row.accountManagerUuid,
      }
    : null;
}

export function useDriversQuery() {
  const compiled = db
    .selectFrom("Drivers as d")
    .innerJoin("Users as u", "u.id", "d.user_uuid")
    .select([
      "d.id as id",
      "u.first_name as firstName",
      "u.last_name as lastName",
      "d.is_active as isActive",
      "d.account_manager_uuid as accountManagerUuid",
    ])
    .where("d.is_active", "=", 1)
    .where("u.status_uuid", "=", STATUSES.active)
    .orderBy("u.first_name", "asc")
    .compile();

  return useTypedQuery(compiled, expect<DriverRow>());
}

export function useUnavailabilityQuery(monthStart: string, monthEnd: string) {
  const compiled = db
    .selectFrom("DriverUnavailability as du")
    .select([
      "du.id as id",
      "du.driver_uuid as driverUuid",
      "du.date_unavailable as dateUnavailable",
    ])
    .where("du.date_unavailable", ">=", monthStart)
    .where("du.date_unavailable", "<=", monthEnd)
    .compile();

  return useTypedQuery(compiled, expect<UnavailabilityRow>());
}

export async function toggleUnavailability(
  existingId: string | null,
  driverUuid: string,
  date: string,
) {
  if (existingId) {
    const compiled = db.deleteFrom("DriverUnavailability").where("id", "=", existingId).compile();
    await typedExecute(compiled);
  } else {
    const compiled = db
      .insertInto("DriverUnavailability")
      .values({
        id: crypto.randomUUID(),
        driver_uuid: driverUuid,
        date_unavailable: date,
        updated_at: new Date().toISOString(),
      })
      .compile();
    await typedExecute(compiled);
  }
}
