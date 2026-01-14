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
    .select([
      "u.first_name as firstName",
      "u.last_name as lastName",
      "u.email as email",
      "u.is_admin as isAdmin",
      "u.status_uuid as statusUuid",

      // role flags
      sql<number>`exists (
      select 1
      from "Drivers" d2
      where d2.user_uuid = u.id
        and d2.is_active = 1
    )`.as("isDriver"),

      sql<number>`exists (
      select 1
      from "AccountManagers" am
      where am.user_uuid = u.id
        and am.is_active = 1
    )`.as("isAccountManager"),

      // driver fields (null if no active driver row)
      "d.tax as tax",
      "d.pay_rate_cents as payRateCents",
      "d.pay_currency as payCurrency",
      "d.pay_per_unit as payPerUnit",
      "d.account_manager_uuid as accountManagerUuid",

      // PowerSync/SQLite-friendly "empty arrays" (return JSON text; parse in TS if you care)
      sql<string>`'[]'`.as("summerBleacherUuids"),
      sql<string>`'[]'`.as("winterBleacherUuids"),
      sql<string>`'[]'`.as("assignedDriverUuids"),
    ])
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
