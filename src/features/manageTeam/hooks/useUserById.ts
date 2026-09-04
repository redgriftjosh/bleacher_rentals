"use client";
import { db } from "@/components/providers/SystemProvider";
import { sql } from "@powersync/kysely-driver";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useEffect, useMemo } from "react";
import { useCurrentUserStore, TeamRoleTab } from "../state/useCurrentUserStore";

type UserRealtimeRow = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isAdmin: number | null;
  statusUuid: string | null;

  isDriver: number;
  isAccountManager: number;
  isDeveloper: number;
  driverIsActive: number | null;
  amIsActive: number | null;
  devIsActive: number | null;
  autoSubscribeToNewTickets: number | null;

  taxDec: number | null;
  payRateCents: number | null;
  payCurrency: string | null;
  payPerUnit: string | null;
  accountManagerUuid: string | null;

  assignedDriverUuids: string;
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export function useRealtimeHydrateCurrentUserStore() {
  const userUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const isOpen = useCurrentUserStore((s) => s.isOpen);

  const compiled = useMemo(() => {
    const effectiveUuid = isOpen && userUuid ? userUuid : ZERO_UUID;

    return db
      .selectFrom("Users as u")
      .leftJoin("Drivers as d", "d.user_uuid", "u.id")
      .leftJoin("AccountManagers as am", "am.user_uuid", "u.id")
      .leftJoin("Developers as dev", "dev.user_uuid", "u.id")
      .select([
        "u.first_name as firstName",
        "u.last_name as lastName",
        "u.email as email",
        "u.is_admin as isAdmin",
        "u.status_uuid as statusUuid",

        sql<number>`case when ${sql.ref("d.id")} is not null and ${sql.ref("d.is_active")} = 1 then 1 else 0 end`.as(
          "isDriver",
        ),
        sql<number>`case when ${sql.ref("am.id")} is not null and ${sql.ref("am.is_active")} = 1 then 1 else 0 end`.as(
          "isAccountManager",
        ),
        sql<number>`case when ${sql.ref("dev.id")} is not null and ${sql.ref("dev.is_active")} = 1 then 1 else 0 end`.as(
          "isDeveloper",
        ),
        sql<number | null>`${sql.ref("d.is_active")}`.as("driverIsActive"),
        sql<number | null>`${sql.ref("am.is_active")}`.as("amIsActive"),
        sql<number | null>`${sql.ref("dev.is_active")}`.as("devIsActive"),
        sql<number | null>`${sql.ref("dev.auto_subscribe_to_new_tickets")}`.as(
          "autoSubscribeToNewTickets",
        ),

        "d.tax_dec as taxDec",
        "d.pay_rate_cents as payRateCents",
        "d.pay_currency as payCurrency",
        "d.pay_per_unit as payPerUnit",
        "d.account_manager_uuid as accountManagerUuid",

        sql<string>`'[]'`.as("assignedDriverUuids"),
      ])
      .where("u.id", "=", effectiveUuid)
      .limit(1)
      .compile();
  }, [isOpen, userUuid]);

  const { data } = useTypedQuery(compiled, expect<UserRealtimeRow>());

  const row = isOpen && userUuid ? data?.[0] : undefined;

  useEffect(() => {
    if (!isOpen || !userUuid || !row) return;

    useCurrentUserStore.setState((prev) => ({
      ...prev,
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
      email: row.email ?? "",
      isAdmin: Boolean(row.isAdmin),
      statusUuid: row.statusUuid,
      isDriver: Boolean(row.isDriver),
      isAccountManager: Boolean(row.isAccountManager),
      isDeveloper: Boolean(row.isDeveloper),
      autoSubscribeToNewTickets: Boolean(row.autoSubscribeToNewTickets ?? true),

      taxDec: row.taxDec ?? undefined,
      payRateCents: row.payRateCents,
      payCurrency: (row.payCurrency as "CAD" | "USD") ?? "CAD",
      payPerUnit: (row.payPerUnit as "KM" | "MI" | "HR") ?? "KM",
      accountManagerUuid: row.accountManagerUuid,

      assignedDriverUuids: JSON.parse(row.assignedDriverUuids ?? "[]"),
    }));
  }, [isOpen, userUuid, row]);
}
