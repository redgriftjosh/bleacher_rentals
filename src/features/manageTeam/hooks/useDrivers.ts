"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type Driver = {
  driverUuid: string;
  tax: number | null;
  payRateCents: number | null;
  payPerUnit: string | null;
  payCurrency: string | null;
  accountManagerFirstName: string | null;
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  clerkUserId: string | null;
  createdAt: string | null;
  statusUuid: string | null;
};

/**
 * Hook to fetch all account managers with their account_manager_id from the database
 */
export function useDrivers(): Driver[] {
  const compiled = db
    .selectFrom("Drivers as d")
    .innerJoin("Users as u", "u.id", "d.user_uuid")
    .leftJoin("AccountManagers as am", "d.account_manager_uuid", "am.id")
    .leftJoin("Users as amu", "amu.id", "am.user_uuid")
    .select([
      "d.id as driverUuid",
      "d.tax as tax",
      "d.pay_rate_cents as payRateCents",
      "d.pay_per_unit as payPerUnit",
      "d.pay_currency as payCurrency",
      "amu.first_name as accountManagerFirstName",
      "u.id as userUuid",
      "u.first_name as firstName",
      "u.last_name as lastName",
      "u.email as email",
      "u.clerk_user_id as clerkUserId",
      "u.created_at as createdAt",
      "u.status_uuid as statusUuid",
    ])
    .orderBy("u.first_name", "asc")
    .orderBy("u.last_name", "asc")
    .compile();

  const { data } = useTypedQuery(compiled, expect<Driver>());

  return data ?? [];
}
