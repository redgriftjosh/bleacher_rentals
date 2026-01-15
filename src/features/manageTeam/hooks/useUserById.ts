"use client";
import { db } from "@/components/providers/SystemProvider";
import { sql } from "@powersync/kysely-driver";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useEffect, useMemo } from "react";
import { useCurrentUserStore } from "../state/useCurrentUserStore";
import type { CompiledQuery } from "kysely";

type UserRealtimeRow = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isAdmin: number | null;
  statusUuid: string | null;

  isDriver: number;
  isAccountManager: number;

  tax: number | null;
  payRateCents: number | null;
  payCurrency: string | null;
  payPerUnit: string | null;
  accountManagerUuid: string | null;

  summerBleacherUuids: string;
  winterBleacherUuids: string;
  assignedDriverUuids: string;
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export function useRealtimeHydrateCurrentUserStore() {
  const userUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const isOpen = useCurrentUserStore((s) => s.isOpen);

  // Always compile a valid query
  const compiled = useMemo(() => {
    const effectiveUuid = isOpen && userUuid ? userUuid : ZERO_UUID;

    return db
      .selectFrom("Users as u")
      .leftJoin("Drivers as d", (join) =>
        join.onRef("d.user_uuid", "=", "u.id").on("d.is_active", "=", 1)
      )
      .leftJoin("AccountManagers as am", (join) =>
        join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1)
      )
      .select((eb) => {
        const summerDistinct = eb
          .selectFrom("BleacherUsers as bu")
          .select(["bu.bleacher_uuid as bleacher_uuid"])
          .whereRef("bu.user_uuid", "=", "u.id")
          .where("bu.season", "=", "SUMMER")
          .where("bu.bleacher_uuid", "is not", null)
          .distinct()
          .as("summer_rows");

        const winterDistinct = eb
          .selectFrom("BleacherUsers as bu")
          .select(["bu.bleacher_uuid as bleacher_uuid"])
          .whereRef("bu.user_uuid", "=", "u.id")
          .where("bu.season", "=", "WINTER")
          .where("bu.bleacher_uuid", "is not", null)
          .distinct()
          .as("winter_rows");

        return [
          "u.first_name as firstName",
          "u.last_name as lastName",
          "u.email as email",
          "u.is_admin as isAdmin",
          "u.status_uuid as statusUuid",

          // type-safe flags via join presence
          sql<number>`case when ${sql.ref("d.id")} is null then 0 else 1 end`.as("isDriver"),
          sql<number>`case when ${sql.ref("am.id")} is null then 0 else 1 end`.as(
            "isAccountManager"
          ),

          "d.tax as tax",
          "d.pay_rate_cents as payRateCents",
          "d.pay_currency as payCurrency",
          "d.pay_per_unit as payPerUnit",
          "d.account_manager_uuid as accountManagerUuid",

          sql<string>`coalesce((
            select json_group_array(bleacher_uuid)
            from (${summerDistinct})
          ), '[]')`.as("summerBleacherUuids"),

          sql<string>`coalesce((
            select json_group_array(bleacher_uuid)
            from (${winterDistinct})
          ), '[]')`.as("winterBleacherUuids"),

          sql<string>`'[]'`.as("assignedDriverUuids"),
        ];
      })
      .where("u.id", "=", effectiveUuid)
      .limit(1)
      .compile();
  }, [isOpen, userUuid]);

  // ✅ hook is always called
  const { data } = useTypedQuery(compiled, expect<UserRealtimeRow>());

  const row = isOpen && userUuid ? data?.[0] : undefined;
  console.log("useRealtimeHydrateCurrentUserStore row:", row);

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

      tax: row.tax ?? undefined,
      payRateCents: row.payRateCents,
      payCurrency: (row.payCurrency as "CAD" | "USD") ?? "CAD",
      payPerUnit: (row.payPerUnit as "KM" | "MI" | "HR") ?? "KM",
      accountManagerUuid: row.accountManagerUuid,

      summerBleacherUuids: JSON.parse(row.summerBleacherUuids ?? "[]"),
      winterBleacherUuids: JSON.parse(row.winterBleacherUuids ?? "[]"),
      assignedDriverUuids: JSON.parse(row.assignedDriverUuids ?? "[]"),
    }));
  }, [isOpen, userUuid, row]);
}

// export function useRealtimeHydrateCurrentUserStore() {
//   const userUuid = useCurrentUserStore((s) => s.existingUserUuid);
//   const isOpen = useCurrentUserStore((s) => s.isOpen);

//   const compiled = useMemo<CompiledQuery<UserRealtimeRow> | null>(() => {
//     if (!userUuid || !isOpen) return null;

//     return db
//       .selectFrom("Users as u")
//       .leftJoin("Drivers as d", (join) =>
//         join.onRef("d.user_uuid", "=", "u.id").on("d.is_active", "=", 1)
//       )
//       .leftJoin("AccountManagers as am", (join) =>
//         join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1)
//       )
//       .select((eb) => {
//         const summerDistinct = eb
//           .selectFrom("BleacherUsers as bu")
//           .select(["bu.bleacher_uuid as bleacher_uuid"])
//           .whereRef("bu.user_uuid", "=", "u.id")
//           .where("bu.season", "=", "SUMMER")
//           .where("bu.bleacher_uuid", "is not", null)
//           .distinct()
//           .as("summer_rows");

//         const winterDistinct = eb
//           .selectFrom("BleacherUsers as bu")
//           .select(["bu.bleacher_uuid as bleacher_uuid"])
//           .whereRef("bu.user_uuid", "=", "u.id")
//           .where("bu.season", "=", "WINTER")
//           .where("bu.bleacher_uuid", "is not", null)
//           .distinct()
//           .as("winter_rows");

//         return [
//           "u.first_name as firstName",
//           "u.last_name as lastName",
//           "u.email as email",
//           "u.is_admin as isAdmin",
//           "u.status_uuid as statusUuid",

//           sql<number>`case when ${sql.ref("d.id")} is null then 0 else 1 end`.as("isDriver"),
//           sql<number>`case when ${sql.ref("am.id")} is null then 0 else 1 end`.as(
//             "isAccountManager"
//           ),

//           "d.tax as tax",
//           "d.pay_rate_cents as payRateCents",
//           "d.pay_currency as payCurrency",
//           "d.pay_per_unit as payPerUnit",
//           "d.account_manager_uuid as accountManagerUuid",

//           sql<string>`coalesce((
//             select json_group_array(bleacher_uuid)
//             from (${summerDistinct})
//           ), '[]')`.as("summerBleacherUuids"),

//           sql<string>`coalesce((
//             select json_group_array(bleacher_uuid)
//             from (${winterDistinct})
//           ), '[]')`.as("winterBleacherUuids"),

//           sql<string>`'[]'`.as("assignedDriverUuids"),
//         ];
//       })
//       .where("u.id", "=", userUuid)
//       .limit(1)
//       .compile();
//   }, [userUuid, isOpen]);

//   // ✅ call hook unconditionally
//   const queryResult = compiled
//     ? useTypedQuery(compiled, expect<UserRealtimeRow>())
//     : ({ data: undefined } as { data?: UserRealtimeRow[] });

//   const row = queryResult.data?.[0];

//   // ✅ hydrate in an effect; guard nulls
//   useEffect(() => {
//     if (!isOpen || !userUuid || !row) return;

//     useCurrentUserStore.setState((prev) => ({
//       ...prev,
//       firstName: row.firstName ?? "",
//       lastName: row.lastName ?? "",
//       email: row.email ?? "",
//       isAdmin: Boolean(row.isAdmin),
//       statusUuid: row.statusUuid,
//       isDriver: Boolean(row.isDriver),
//       isAccountManager: Boolean(row.isAccountManager),

//       tax: row.tax ?? undefined,
//       payRateCents: row.payRateCents,
//       payCurrency: (row.payCurrency as "CAD" | "USD") ?? "CAD",
//       payPerUnit: (row.payPerUnit as "KM" | "MI" | "HR") ?? "KM",
//       accountManagerUuid: row.accountManagerUuid,

//       summerBleacherUuids: JSON.parse(row.summerBleacherUuids ?? "[]"),
//       winterBleacherUuids: JSON.parse(row.winterBleacherUuids ?? "[]"),
//       assignedDriverUuids: JSON.parse(row.assignedDriverUuids ?? "[]"),
//     }));
//   }, [row, isOpen, userUuid]);
// }
