"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type Row = {
  id: string;
  header: string | null;
  description: string | null;
  value_cents: number | null;
  quantity: number | null;
  currency: string | null;
  bleacher_type_uuid: string | null;
  is_template: number | null;
  bleacher_type_name: string | null;
};

export type EventLineItemRow = {
  id: string;
  header: string;
  description: string | null;
  valueCents: number;
  quantity: number;
  currency: string;
  bleacherTypeUuid: string | null;
  bleacherTypeName: string | null;
  isTemplate: boolean;
};

export function useEventLineItems(eventId: string | null) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventLineItems as li")
        .leftJoin("BleacherTypes as bt", "li.bleacher_type_uuid", "bt.id")
        .select([
          "li.id as id",
          "li.header as header",
          "li.description as description",
          "li.value_cents as value_cents",
          "li.quantity as quantity",
          "li.currency as currency",
          "li.bleacher_type_uuid as bleacher_type_uuid",
          "li.is_template as is_template",
          "bt.name as bleacher_type_name",
        ])
        .where("li.event_uuid", "=", eventId ?? "")
        .where("li.deleted", "=", 0)
        .orderBy("li.created_at", "asc")
        .compile(),
    [eventId],
  );

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  const lineItems = useMemo<EventLineItemRow[]>(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        header: r.header ?? "",
        description: r.description,
        valueCents: r.value_cents ?? 0,
        quantity: r.quantity ?? 1,
        currency: r.currency ?? "USD",
        bleacherTypeUuid: r.bleacher_type_uuid,
        bleacherTypeName: r.bleacher_type_name,
        isTemplate: (r.is_template ?? 0) === 1,
      })),
    [data],
  );

  return { lineItems, isLoading, error };
}
