"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

/**
 * Staff names by user id, for rows that record who did something.
 *
 * A payment's "Recorded by" column is the whole point of attributing manual
 * entry, and a raw uuid there attributes it to nobody.
 */

type Row = { id: string; first_name: string | null; last_name: string | null };

export function useUserNames(): Map<string, string> {
  const compiled = useMemo(
    () => db.selectFrom("Users").select(["id", "first_name", "last_name"]).compile(),
    [],
  );

  const { data } = useTypedQuery(compiled, expect<Row>());

  return useMemo(
    () =>
      new Map(
        (data ?? []).map((u) => [
          u.id,
          [u.first_name, u.last_name].filter(Boolean).join(" ") || "Staff",
        ]),
      ),
    [data],
  );
}
