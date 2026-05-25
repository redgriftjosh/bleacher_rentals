"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

export type EventRow = {
  event_uuid: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  setup_start: string | null;
  teardown_end: string | null;
  total_seats: number | null;
  seven_row: number | null;
  ten_row: number | null;
  fifteen_row: number | null;
  lenient: number | null;
  booked: number | null;
  notes: string | null;
  must_be_clean: number | null;
  hsl_hue: number | null;
  goodshuffle_url: string | null;
  event_status: string | null;
  created_by_user_uuid: string | null;
  address_uuid: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state_province: string | null;
  address_zip_postal: string | null;
};

function buildEventsQuery() {
  return db
    .selectFrom("Events as e")
    .leftJoin("Addresses as a", "a.id", "e.address_uuid")
    .where("e.event_status", "!=", "lost")
    .select([
      "e.id as event_uuid",
      "e.event_name",
      "e.event_start",
      "e.event_end",
      "e.setup_start",
      "e.teardown_end",
      "e.total_seats",
      "e.seven_row",
      "e.ten_row",
      "e.fifteen_row",
      "e.lenient",
      "e.booked",
      "e.notes",
      "e.must_be_clean",
      "e.hsl_hue",
      "e.goodshuffle_url",
      "e.event_status",
      "e.created_by_user_uuid",
      "e.address_uuid",
      "a.street as address_street",
      "a.city as address_city",
      "a.state_province as address_state_province",
      "a.zip_postal as address_zip_postal",
    ])
    .orderBy("e.event_start", "asc");
}

export function useEventsTable(opts?: {
  onlyMine?: boolean;
  userUuid?: string | null;
}) {
  const onlyMine = opts?.onlyMine ?? false;
  const userUuid = opts?.userUuid ?? null;

  const compiled = useMemo(() => {
    let q = buildEventsQuery();
    if (onlyMine && userUuid) {
      q = q.where("e.created_by_user_uuid", "=", userUuid) as typeof q;
    }
    return q.compile();
  }, [onlyMine, userUuid]);

  return useTypedQuery(compiled, expect<EventRow>());
}
