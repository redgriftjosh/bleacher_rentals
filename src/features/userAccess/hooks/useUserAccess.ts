"use client";
import { useUser } from "@clerk/nextjs";
import {
  determineUserAccess,
  type AccessResult,
  type WebRole,
  type BlockedReason,
} from "../logic/determineAccess";
import { useMemo } from "react";
import { usePowerSync } from "@powersync/react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import type { UserAccessData } from "../types";

export type { UserAccessData } from "../types";

export type UserAccessState =
  | { status: "loading" }
  | { status: "blocked"; reason: BlockedReason }
  | { status: "active"; roles: WebRole[]; userId: string; accountManagerId: string | null };

export function useUserAccess(): UserAccessState {
  const powerSync = usePowerSync();
  const { user } = useUser();
  const clerkUserId = user?.id ?? null;

  const clerkUserIdForQuery = clerkUserId ?? "__no_clerk_user__";

  const compiled = useMemo(() => {
    return db
      .selectFrom("Users as u")
      .leftJoin("AccountManagers as am", (join) =>
        join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1),
      )
      .leftJoin("Drivers as d", (join) =>
        join.onRef("d.user_uuid", "=", "u.id").on("d.is_active", "=", 1),
      )
      .leftJoin("Developers as dev", (join) =>
        join.onRef("dev.user_uuid", "=", "u.id").on("dev.is_active", "=", 1),
      )
      .select([
        "u.id as id",
        "u.status_uuid",
        "u.is_admin as is_admin",
        "u.is_viewer as is_viewer",
        "am.id as account_manager_id",
        "d.id as driver_id",
        "dev.id as developer_id",
      ])
      .where("u.clerk_user_id", "=", clerkUserIdForQuery)
      .limit(1)
      .compile();
  }, [clerkUserIdForQuery]);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<UserAccessData>());

  if (process.env.NODE_ENV !== "production") {
    console.log("User Access Data:", JSON.stringify(data, null, 2));
    console.log("User Access Query Error:", error);
    console.log("User Access Query Loading:", isLoading);

    const hasSynced = powerSync.currentStatus?.hasSynced === true;
    const downloading = powerSync.currentStatus?.dataFlowStatus?.downloading === true;
    const downloadError = powerSync.currentStatus?.dataFlowStatus?.downloadError;

    console.log("[PowerSync] status", {
      hasSynced,
      downloading,
      downloadError: downloadError?.message,
    });

    if (!hasSynced || downloading || downloadError) {
      console.warn("[PowerSync] Not fully synced yet", {
        hasSynced,
        downloading,
        downloadError: downloadError?.message,
      });
    }
  }

  if (!clerkUserId || isLoading) {
    return { status: "loading" };
  }

  if (error || !data?.[0]) {
    return { status: "blocked", reason: "cannot-find-account" };
  }

  return determineUserAccess(data[0]);
}
