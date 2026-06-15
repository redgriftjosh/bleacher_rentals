"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type Row = {
  id: string;
  name: string | null;
  html_content: string | null;
  created_at: string | null;
  deleted: number | null;
};

export type TermsAndConditionsItem = {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
};

function toItem(r: Row): TermsAndConditionsItem {
  return {
    id: r.id,
    name: r.name ?? "",
    htmlContent: r.html_content ?? "",
    createdAt: r.created_at ?? "",
  };
}

export function useTermsAndConditions() {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("TermsAndConditions")
        .select(["id", "name", "html_content", "created_at", "deleted"])
        .where("deleted", "=", 0)
        .orderBy("created_at", "desc")
        .compile(),
    [],
  );

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  const items = useMemo<TermsAndConditionsItem[]>(() => (data ?? []).map(toItem), [data]);

  return { items, isLoading, error };
}
