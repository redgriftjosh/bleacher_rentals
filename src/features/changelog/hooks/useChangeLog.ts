"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { sql } from "kysely";
import { useMemo } from "react";
import type { ChangeLogEntry } from "../types";

type Row = {
  id: string;
  version: string | null;
  released_at: string | null;
  body_md: string | null;
};

/** All released versions, newest first. */
export function useChangeLog() {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("ChangeLog")
        .select(["id", "version", "released_at", "body_md"])
        .where("released_at", ">=", sql<string>`datetime('now', '-6 months')`)
        .orderBy("released_at", "desc")
        .compile(),
    [],
  );

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  const entries = useMemo<ChangeLogEntry[]>(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        version: r.version ?? "",
        released_at: r.released_at ?? "",
        body_md: r.body_md ?? "",
      })),
    [data],
  );

  return { entries, isLoading, error };
}
