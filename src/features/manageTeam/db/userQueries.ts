import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";
import { db } from "@/components/providers/SystemProvider";
import { sql } from "@powersync/kysely-driver";
import { typedGetAll, expect } from "@/lib/powersync/typedQuery";

type TypedSupabaseClient = SupabaseClient<Database>;

type FetchUserResult = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isAdmin: number | null;
  statusUuid: string | null;
  driverId: string | null;
  tax: number | null;
  payRateCents: number | null;
  payCurrency: string | null;
  payPerUnit: string | null;
  driverAccountManagerUuid: string | null;
  accountManagerId: string | null;
  bleacherId: string | null;
  summerAmUuid: string | null;
  winterAmUuid: string | null;
};

export async function fetchUserById(userUuid: string) {
  const compiled = db
    .selectFrom("Users as u")
    .leftJoin("Drivers as d", (join) =>
      join.onRef("d.user_uuid", "=", "u.id").on("d.is_active", "=", 1)
    )
    .leftJoin("AccountManagers as am", (join) =>
      join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1)
    )
    // join bleachers only if this user is an active account manager
    .leftJoin("Bleachers as b", (join) =>
      join.on(
        sql`(${sql.ref("b.summer_account_manager_uuid")} = ${sql.ref("am.id")}
              OR ${sql.ref("b.winter_account_manager_uuid")} = ${sql.ref("am.id")})`
      )
    )
    .select([
      "u.first_name as firstName",
      "u.last_name as lastName",
      "u.email as email",
      "u.is_admin as isAdmin",
      "u.status_uuid as statusUuid",

      "d.id as driverId",
      "d.tax as tax",
      "d.pay_rate_cents as payRateCents",
      "d.pay_currency as payCurrency",
      "d.pay_per_unit as payPerUnit",
      "d.account_manager_uuid as driverAccountManagerUuid",

      "am.id as accountManagerId",

      "b.id as bleacherId",
      "b.summer_account_manager_uuid as summerAmUuid",
      "b.winter_account_manager_uuid as winterAmUuid",
    ])
    .where("u.id", "=", userUuid)
    .compile();

  const data = await typedGetAll(compiled, expect<FetchUserResult>());

  return data[0];

  // try {
  //   // 1. Fetch user data
  //   const { data: userData, error: userError } = await supabase
  //     .from("Users")
  //     .select("*")
  //     .eq("id", userUuid)
  //     .single();

  //   if (userError) throw userError;

  //   // 2. Check if user is a driver (and active)
  //   const { data: driverData } = await supabase
  //     .from("Drivers")
  //     .select("*")
  //     .eq("user_uuid", userUuid)
  //     .eq("is_active", true)
  //     .maybeSingle();

  //   // 3. Check if user is an account manager (and active)
  //   const { data: accountManagerData } = await supabase
  //     .from("AccountManagers")
  //     .select("*")
  //     .eq("user_uuid", userUuid)
  //     .eq("is_active", true)
  //     .maybeSingle();

  //   // 4. If account manager, fetch bleacher assignments
  //   let summerBleacherUuids: string[] = [];
  //   let winterBleacherUuids: string[] = [];
  //   let assignedDriverUuids: string[] = [];

  //   if (accountManagerData) {
  //     const accountManagerUuid = accountManagerData.id;

  //     const { data: bleachers } = await supabase
  //       .from("Bleachers")
  //       .select("id, summer_account_manager_uuid, winter_account_manager_uuid")
  //       .or(
  //         `summer_account_manager_uuid.eq.${accountManagerUuid},winter_account_manager_uuid.eq.${accountManagerUuid}`
  //       );

  //     if (bleachers) {
  //       summerBleacherUuids = bleachers
  //         .filter((b) => b.summer_account_manager_uuid === accountManagerUuid)
  //         .map((b) => b.id);
  //       winterBleacherUuids = bleachers
  //         .filter((b) => b.winter_account_manager_uuid === accountManagerUuid)
  //         .map((b) => b.id);
  //     }

  //     // TODO: Fetch assigned drivers when that relationship is implemented
  //     // For now, leaving as empty array
  //   }

  //   return {
  //     success: true,
  //     data: {
  //       firstName: userData.first_name,
  //       lastName: userData.last_name,
  //       email: userData.email,
  //       isAdmin: userData.is_admin,
  //       status_uuid: userData.status_uuid,
  //       isDriver: !!driverData,
  //       isAccountManager: !!accountManagerData,
  //       tax: driverData?.tax ?? undefined,
  //       payRateCents: driverData?.pay_rate_cents ?? null,
  //       payCurrency: (driverData?.pay_currency as "CAD" | "USD") ?? "CAD",
  //       payPerUnit: (driverData?.pay_per_unit as "KM" | "MI" | "HR") ?? "KM",
  //       accountManagerUuid: driverData?.account_manager_uuid ?? null,
  //       summerBleacherUuids,
  //       winterBleacherUuids,
  //       assignedDriverUuids,
  //     },
  //   };
  // } catch (error) {
  //   console.error("Error fetching user:", error);
  //   return {
  //     success: false,
  //     error: error instanceof Error ? error.message : "Unknown error",
  //   };
  // }
}
