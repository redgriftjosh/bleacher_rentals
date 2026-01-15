import { db } from "@/components/providers/SystemProvider";
import { sql } from "@powersync/kysely-driver";
import { typedGetAll, expect } from "@/lib/powersync/typedQuery";
import { CurrentUserState } from "../state/useCurrentUserStore";

type FetchUserResult = {
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

export async function fetchUserById(userUuid: string): Promise<CurrentUserState | null> {
  const compiled = db
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

        // ✅ fully type-safe flags derived from LEFT JOIN presence
        sql<number>`case when ${sql.ref("d.id")} is null then 0 else 1 end`.as("isDriver"),
        sql<number>`case when ${sql.ref("am.id")} is null then 0 else 1 end`.as("isAccountManager"),

        // driver fields
        "d.tax as tax",
        "d.pay_rate_cents as payRateCents",
        "d.pay_currency as payCurrency",
        "d.pay_per_unit as payPerUnit",
        "d.account_manager_uuid as accountManagerUuid",

        // bleacher arrays
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
    .where("u.id", "=", userUuid)
    .limit(1)
    .compile();

  const data = await typedGetAll(compiled, expect<FetchUserResult>());
  const raw = data[0];

  if (!raw) return null;

  // Map to CurrentUserState
  return {
    // Basic user info
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    email: raw.email ?? "",
    isAdmin: Boolean(raw.isAdmin),
    statusUuid: raw.statusUuid,

    // Role flags
    isDriver: Boolean(raw.isDriver),
    isAccountManager: Boolean(raw.isAccountManager),

    // Driver-specific fields
    tax: raw.tax ?? undefined,
    payRateCents: raw.payRateCents,
    payCurrency: (raw.payCurrency as "CAD" | "USD") ?? "USD",
    payPerUnit: (raw.payPerUnit as "KM" | "MI" | "HR") ?? "KM",
    accountManagerUuid: raw.accountManagerUuid,

    // Account Manager-specific fields
    summerBleacherUuids: JSON.parse(raw.summerBleacherUuids),
    winterBleacherUuids: JSON.parse(raw.winterBleacherUuids),
    assignedDriverUuids: JSON.parse(raw.assignedDriverUuids),

    // UI state defaults
    existingUserUuid: null,
    isOpen: false,
    isSubmitting: false,
  };
}
