"use client";

import { db } from "@/components/providers/SystemProvider";
import { typedExecute, expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useUser } from "@clerk/nextjs";
import { usePowerSync } from "@powersync/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardFilterState, getDefaultSeason, type Season, type YAxis } from "./types";

type UserContextRow = {
  userUuid: string;
  accountManagerUuid: string | null;
};

type SettingsRow = {
  yAxis: string | null;
  summerHomeBaseUuids: string | null;
  winterHomeBaseUuids: string | null;
  rows: string | null;
  stateProvinces: string | null;
  onlyShowMyEvents: number | null;
  optimizationMode: number | null;
  season: string | null;
  accountManagerUuid: string | null;
  rowsQuickFilter: number | null;
};

const parseJsonArray = <T>(value: string | null | undefined, fallback: T[]): T[] => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
};

const toBool = (value: number | boolean | null | undefined): boolean => {
  if (typeof value === "boolean") return value;
  return Boolean(value);
};

const toSeason = (value: string | null): Season => {
  if (value === "SUMMER" || value === "WINTER") return value;
  return null;
};

const toYAxis = (value: string | null | undefined): YAxis => {
  return value === "Events" ? "Events" : "Bleachers";
};

export function useDashboardFilterSettings(): {
  state: DashboardFilterState | null;
  userContext: UserContextRow | null;
  setField: <K extends keyof DashboardFilterState>(
    key: K,
    value: DashboardFilterState[K],
  ) => Promise<void>;
} {
  const powerSync = usePowerSync();
  const [hasInitialSync, setHasInitialSync] = useState(false);

  const { user } = useUser();
  const clerkUserId = user?.id ?? null;

  // Always compile + query (hook rules); use a sentinel when signed out.
  const clerkUserIdForQuery = clerkUserId ?? "__no_clerk_user__";

  const compiledUserContext = useMemo(() => {
    return db
      .selectFrom("Users as u")
      .leftJoin("AccountManagers as am", (join) =>
        join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1),
      )
      .select(["u.id as userUuid", "am.id as accountManagerUuid"])
      .where("u.clerk_user_id", "=", clerkUserIdForQuery)
      .limit(1)
      .compile();
  }, [clerkUserIdForQuery]);

  const {
    data: userContextData,
    isLoading: isUserContextLoading,
    isFetching: isUserContextFetching,
  } = useTypedQuery(compiledUserContext, expect<UserContextRow>());
  const userContext = clerkUserId ? (userContextData?.[0] ?? null) : null;

  const userUuidForQuery = userContext?.userUuid ?? "__no_user__";

  const compiledSettings = useMemo(() => {
    return db
      .selectFrom("DashboardFilterSettings as s")
      .select([
        "s.y_axis as yAxis",
        "s.summer_home_base_uuids as summerHomeBaseUuids",
        "s.winter_home_base_uuids as winterHomeBaseUuids",
        "s.rows as rows",
        "s.state_provinces as stateProvinces",
        "s.only_show_my_events as onlyShowMyEvents",
        "s.optimization_mode as optimizationMode",
        "s.season as season",
        "s.account_manager_uuid as accountManagerUuid",
        "s.rows_quick_filter as rowsQuickFilter",
      ])
      .where("s.user_uuid", "=", userUuidForQuery)
      .limit(1)
      .compile();
  }, [userUuidForQuery]);

  const {
    data: settingsData,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
  } = useTypedQuery(compiledSettings, expect<SettingsRow>());
  const settingsRow = userContext ? (settingsData?.[0] ?? null) : null;

  // Ensure a settings row exists (local-first insert; sync will follow)
  useEffect(() => {
    // Don’t interpret "no rows" as "missing" until queries are done.
    if (isUserContextLoading || isUserContextFetching) return;
    if (isSettingsLoading || isSettingsFetching) return;

    if (!userContext?.userUuid) return;
    if (settingsRow) return;

    const nowIso = new Date().toISOString();
    const defaultSeason = getDefaultSeason();

    // PowerSync exposes synced tables as views in SQLite; SQLite doesn't allow
    // `INSERT ... ON CONFLICT DO ...` (UPSERT) against views.
    // So we do a plain insert and ignore the unique constraint failure.
    const insert = db
      .insertInto("DashboardFilterSettings")
      .values({
        // Use a stable primary key so remote upserts are idempotent.
        // PowerSync's BackendConnector upserts on `id` by default.
        id: userContext.userUuid,
        created_at: nowIso,
        updated_at: nowIso,
        user_uuid: userContext.userUuid,
        y_axis: "Bleachers",
        summer_home_base_uuids: "[]",
        winter_home_base_uuids: "[]",
        rows: "[]",
        state_provinces: "[]",
        only_show_my_events: 1,
        optimization_mode: 0,
        season: defaultSeason,
        account_manager_uuid: userContext.accountManagerUuid,
        rows_quick_filter: null,
      })
      .compile();

    typedExecute(insert).catch((error: any) => {
      const msg = String(error?.message ?? error);
      // expected when row already exists
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("constraint")) return;
      console.error("Failed to create DashboardFilterSettings row:", error);
    });
  }, [
    isSettingsFetching,
    isSettingsLoading,
    isUserContextFetching,
    isUserContextLoading,
    settingsRow,
    userContext?.accountManagerUuid,
    userContext?.userUuid,
  ]);

  const state = useMemo<DashboardFilterState | null>(() => {
    if (!settingsRow) return null;

    return {
      yAxis: toYAxis(settingsRow.yAxis),
      summerHomeBaseUuids: parseJsonArray<string>(settingsRow.summerHomeBaseUuids, []),
      winterHomeBaseUuids: parseJsonArray<string>(settingsRow.winterHomeBaseUuids, []),
      rows: parseJsonArray<number>(settingsRow.rows, []),
      stateProvinces: parseJsonArray<number>(settingsRow.stateProvinces, []),
      onlyShowMyEvents: toBool(settingsRow.onlyShowMyEvents),
      optimizationMode: toBool(settingsRow.optimizationMode),
      season: toSeason(settingsRow.season),
      accountManagerUuid: settingsRow.accountManagerUuid,
      rowsQuickFilter:
        settingsRow.rowsQuickFilter === 10 || settingsRow.rowsQuickFilter === 15
          ? (settingsRow.rowsQuickFilter as 10 | 15)
          : null,
    };
  }, [settingsRow]);

  const updateDb = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!userContext?.userUuid) return;

      const nowIso = new Date().toISOString();
      const compiled = db
        .updateTable("DashboardFilterSettings")
        .set({
          ...(patch as any),
          updated_at: nowIso,
        } as any)
        .where("user_uuid", "=", userContext.userUuid)
        .compile();

      await typedExecute(compiled);
    },
    [userContext?.userUuid],
  );

  const setField = useCallback(
    async <K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) => {
      switch (key) {
        case "yAxis":
          return updateDb({ y_axis: value as YAxis });

        case "summerHomeBaseUuids":
          return updateDb({ summer_home_base_uuids: JSON.stringify(value) });

        case "winterHomeBaseUuids":
          return updateDb({ winter_home_base_uuids: JSON.stringify(value) });

        case "rows":
          return updateDb({ rows: JSON.stringify(value) });

        case "stateProvinces":
          return updateDb({ state_provinces: JSON.stringify(value) });

        case "onlyShowMyEvents":
          return updateDb({ only_show_my_events: value ? 1 : 0 });

        case "optimizationMode":
          return updateDb({ optimization_mode: value ? 1 : 0 });

        case "season":
          return updateDb({ season: value });

        case "accountManagerUuid":
          return updateDb({ account_manager_uuid: value });

        case "rowsQuickFilter":
          return updateDb({ rows_quick_filter: value });

        default:
          return;
      }
    },
    [updateDb],
  );

  return { state, userContext, setField };
}
