"use client";

import { useMemo } from "react";
import { sql } from "@powersync/kysely-driver";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { getCurrentWeekRange, getLastWeekRange } from "../utils/weekRange";
import type { WeeklyLeaderboardRow } from "../types";

type WeeklyLeaderboardQueryRow = {
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bookedValueCents: number;
};

export function useWeeklyBookedLeaderboard() {
  const week = useMemo(() => getCurrentWeekRange(), []);
  const lastWeek = useMemo(() => getLastWeekRange(), []);

  const compiled = useMemo(() => {
    return db
      .selectFrom("Events as e")
      .innerJoin("Users as u", "e.created_by_user_uuid", "u.id")
      .innerJoin("AccountManagers as am", "am.user_uuid", "u.id")
      .select([
        "u.id as userUuid",
        "u.first_name as firstName",
        "u.last_name as lastName",
        "u.avatar_image_url as avatarUrl",
        sql<number>`coalesce(sum(e.contract_revenue_cents), 0)`.as("bookedValueCents"),
      ])
      .where("e.event_status", "=", "booked")
      .where("e.booked_at", ">=", week.start)
      .where("e.booked_at", "<=", week.end)
        .where("e.contract_revenue_cents", ">", 0)
      .groupBy(["u.id", "u.first_name", "u.last_name", "u.avatar_image_url"])
      .orderBy(sql`bookedValueCents`, "desc")
      .compile();
  }, [week.end, week.start]);

  const lastWeekCompiled = useMemo(() => {
    return db
      .selectFrom("Events as e")
      .innerJoin("Users as u", "e.created_by_user_uuid", "u.id")
      .innerJoin("AccountManagers as am", "am.user_uuid", "u.id")
      .select([
        "u.id as userUuid",
        "u.first_name as firstName",
        "u.last_name as lastName",
        "u.avatar_image_url as avatarUrl",
        sql<number>`coalesce(sum(e.contract_revenue_cents), 0)`.as("bookedValueCents"),
      ])
      .where("e.event_status", "=", "booked")
      .where("e.booked_at", ">=", lastWeek.start)
      .where("e.booked_at", "<=", lastWeek.end)
      .where("e.contract_revenue_cents", ">", 0)
      .groupBy(["u.id", "u.first_name", "u.last_name", "u.avatar_image_url"])
      .orderBy(sql`bookedValueCents`, "desc")
      .compile();
  }, [lastWeek.end, lastWeek.start]);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<WeeklyLeaderboardQueryRow>());
  const { data: lastWeekData } = useTypedQuery(
    lastWeekCompiled,
    expect<WeeklyLeaderboardQueryRow>(),
  );

  const rows: WeeklyLeaderboardRow[] = useMemo(() => {
    return (data ?? []).map((row) => ({
      userUuid: row.userUuid,
      firstName: row.firstName,
      lastName: row.lastName,
      avatarUrl: row.avatarUrl,
      bookedValueCents: row.bookedValueCents,
    }));
  }, [data]);

  const lastWeekRows: WeeklyLeaderboardRow[] = useMemo(() => {
    return (lastWeekData ?? []).map((row) => ({
      userUuid: row.userUuid,
      firstName: row.firstName,
      lastName: row.lastName,
      avatarUrl: row.avatarUrl,
      bookedValueCents: row.bookedValueCents,
    }));
  }, [lastWeekData]);

  const lastWeekWinner = lastWeekRows[0] ?? null;

  return {
    rows,
    isLoading,
    error,
    weekLabel: week.label,
    lastWeekLabel: lastWeek.label,
    lastWeekWinner,
  };
}
