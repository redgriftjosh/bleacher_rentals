"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { filterQuotesBookingsEvents } from "../utils/filterEvents";
import { QuotesBookingsEvent, QuotesBookingsFilters } from "../types";

export function useQuotesAndBookingsData(filters: QuotesBookingsFilters) {
  const compiled = useMemo(() => {
    return db
      .selectFrom("Events as e")
      .leftJoin("Users as u", "e.created_by_user_uuid", "u.id")
      .select([
        "e.id as id",
        "e.event_name as event_name",
        "e.event_start as event_start",
        "e.event_end as event_end",
        "e.event_status as event_status",
        "e.contract_revenue_cents as contract_revenue_cents",
        "e.created_at as created_at",
        "e.created_by_user_uuid as created_by_user_uuid",
        "u.first_name as account_manager_first_name",
        "u.last_name as account_manager_last_name",
      ])
      .orderBy("e.created_at", "desc")
      .compile();
  }, []);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<QuotesBookingsEvent>());

  const filtered = useMemo(() => {
    if (!data) return data;
    return filterQuotesBookingsEvents(data, filters);
  }, [data, filters]);

  return { data: filtered, isLoading, error };
}
