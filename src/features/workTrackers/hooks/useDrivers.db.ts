"use client";
import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";

type Compiled = {
  driver_uuid: string;
  user_uuid: string | null;
  tax: number | null;
  pay_rate_cents: number | null;
  pay_currency: string | null;
  pay_per_unit: string | null;
  is_active: number | null;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type DriverWithUser = {
  driver_uuid: string;
  user_uuid: string;
  tax: number;
  pay_rate_cents: number;
  pay_currency: string;
  pay_per_unit: string;
  is_active: boolean;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export function useDrivers(): {
  data: DriverWithUser[] | null;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { data: currentUserData, isLoading: isCurrentUserLoading } = useCurrentUser();
  const currentUser = currentUserData?.[0];

  // Get account manager ID if user is an account manager
  const accountManagerQuery = useMemo(() => {
    if (!currentUser?.id || currentUser?.is_admin === 1) {
      return null;
    }
    return db
      .selectFrom("AccountManagers")
      .select("id")
      .where("user_uuid", "=", currentUser.id)
      .where("is_active", "=", 1)
      .limit(1)
      .compile();
  }, [currentUser?.id, currentUser?.is_admin]);

  const { data: accountManagerData } = useTypedQuery(
    accountManagerQuery ??
      db.selectFrom("AccountManagers").select("id").where("id", "=", "__no_match__").compile(),
    expect<{ id: string }>(),
  );

  const compiled = useMemo(() => {
    // If no current user or they're neither admin nor account manager, return empty query
    if (!currentUser) {
      return db
        .selectFrom("Drivers as d")
        .innerJoin("Users as u", "u.id", "d.user_uuid")
        .select([
          "d.id as driver_uuid",
          "d.user_uuid as user_uuid",
          "d.tax as tax",
          "d.pay_rate_cents as pay_rate_cents",
          "d.pay_currency as pay_currency",
          "d.pay_per_unit as pay_per_unit",
          "d.is_active as is_active",
          "u.id as user_id",
          "u.first_name as first_name",
          "u.last_name as last_name",
          "u.email as email",
        ])
        .where("d.id", "=", "__no_match__") // This will return no results
        .compile();
    }

    let query = db
      .selectFrom("Drivers as d")
      .innerJoin("Users as u", "u.id", "d.user_uuid")
      .select([
        "d.id as driver_uuid",
        "d.user_uuid as user_uuid",
        "d.tax as tax",
        "d.pay_rate_cents as pay_rate_cents",
        "d.pay_currency as pay_currency",
        "d.pay_per_unit as pay_per_unit",
        "d.is_active as is_active",
        "u.id as user_id",
        "u.first_name as first_name",
        "u.last_name as last_name",
        "u.email as email",
      ])
      .where("d.is_active", "=", 1);

    // If not admin, filter by account manager
    if (currentUser.is_admin !== 1) {
      const accountManagerId = accountManagerData?.[0]?.id;
      if (accountManagerId) {
        query = query.where("d.account_manager_uuid", "=", accountManagerId);
      } else {
        // Not an account manager, return no results
        query = query.where("d.id", "=", "__no_match__");
      }
    }

    return query.orderBy("d.user_uuid", "asc").compile();
  }, [currentUser, accountManagerData]);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Compiled>());

  return {
    data: data as unknown as DriverWithUser[] | null,
    isLoading: isLoading || isCurrentUserLoading,
    error,
  };
}
