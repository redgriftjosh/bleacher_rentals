"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type AlertRow = {
  alert_uuid: string;
  entity_uuid: string | null;
  entity_type: string | null;
  title: string | null;
  message: string | null;
  entity_description: string | null;
};

const compiled = db
  .selectFrom("Alerts as a")
  .select([
    "a.id as alert_uuid",
    "a.entity_uuid",
    "a.entity_type",
    "a.title",
    "a.message",
    "a.entity_description",
  ])
  .compile();

export function useAlertsTable() {
  return useTypedQuery(compiled, expect<AlertRow>());
}
