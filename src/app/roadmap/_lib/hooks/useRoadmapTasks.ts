"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import type { Task, TaskStatus, Tab } from "../types";

type RoadmapTaskRow = {
  id: string;
  created_at: string | null;
  name: string | null;
  description: string | null;
  type: string | null;
  status: string | null;
  created_by_user_uuid: string | null;

  created_by_user_id: string | null;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  created_by_email: string | null;
};

const matchesTab = (status: TaskStatus | null, tab: Tab): boolean => {
  if (tab === "backlog") return status === "backlog";
  if (tab === "completed") return status === "complete";
  // current
  return status !== "backlog" && status !== "complete";
};

export function useRoadmapTasks(selectedTab: Tab) {
  const compiled = useMemo(() => {
    return db
      .selectFrom("Tasks as t")
      .leftJoin("Users as u", "u.id", "t.created_by_user_uuid")
      .select([
        "t.id as id",
        "t.created_at as created_at",
        "t.name as name",
        "t.description as description",
        "t.type as type",
        "t.status as status",
        "t.created_by_user_uuid as created_by_user_uuid",
        "u.id as created_by_user_id",
        "u.first_name as created_by_first_name",
        "u.last_name as created_by_last_name",
        "u.email as created_by_email",
      ])
      .orderBy("t.created_at", "asc")
      .compile();
  }, []);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<RoadmapTaskRow>());

  const tasks = useMemo<Task[]>(() => {
    const rows = data ?? [];

    return rows
      .filter((r) => matchesTab(r.status as any, selectedTab))
      .map((r) => {
        const createdBy = r.created_by_user_id
          ? {
              id: r.created_by_user_id,
              first_name: r.created_by_first_name,
              last_name: r.created_by_last_name,
              email: r.created_by_email ?? "",
            }
          : null;

        return {
          id: r.id,
          created_at: r.created_at ?? "",
          name: r.name ?? "",
          description: r.description ?? "",
          type: (r.type as any) ?? null,
          status: (r.status as any) ?? null,
          created_by_user_uuid: r.created_by_user_uuid,
          created_by_user: createdBy,
        };
      });
  }, [data, selectedTab]);

  return { tasks, isLoading, error };
}
