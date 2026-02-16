"use client";

import { useMemo } from "react";
import { sql } from "@powersync/kysely-driver";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { getCurrentWeekRange } from "../utils/weekRange";
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

  const compiled = useMemo(() => {
    return db
      .selectFrom("Events as e")
      .innerJoin("Users as u", "e.created_by_user_uuid", "u.id")
      .select([
        "u.id as userUuid",
        "u.first_name as firstName",
        "u.last_name as lastName",
        "u.avatar_image_url as avatarUrl",
        sql<number>`coalesce(sum(e.contract_revenue_cents), 0)`.as("bookedValueCents"),
      ])
      .where("e.event_status", "=", "booked")
      .where("e.created_at", ">=", week.start)
      .where("e.created_at", "<=", week.end)
      .groupBy(["u.id", "u.first_name", "u.last_name", "u.avatar_image_url"])
      .orderBy(sql`bookedValueCents`, "desc")
      .compile();
  }, [week.end, week.start]);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<WeeklyLeaderboardQueryRow>());

  const rows: WeeklyLeaderboardRow[] = useMemo(() => {
    return (data ?? []).map((row) => ({
      userUuid: row.userUuid,
      firstName: row.firstName,
      lastName: row.lastName,
      avatarUrl: row.avatarUrl,
      bookedValueCents: row.bookedValueCents,
    }));
  }, [data]);

  return { rows, isLoading, error, weekLabel: week.label };
}
