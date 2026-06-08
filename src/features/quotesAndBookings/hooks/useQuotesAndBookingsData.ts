"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { filterQuotesBookingsEvents } from "../utils/filterEvents";
import { QuotesBookingsEvent, QuotesBookingsFilters } from "../types";
import { useTimezoneStore } from "@/lib/useTimezoneStore";

export function useQuotesAndBookingsData(filters: QuotesBookingsFilters) {
  const timezone = useTimezoneStore((s) => s.timezone);

  const compiled = useMemo(() => {
    return db
      .selectFrom("Events as e")
      .leftJoin("Users as u", "e.created_by_user_uuid", "u.id")
      .leftJoin("Addresses as a", "e.address_uuid", "a.id")
      .leftJoin("Contacts as ct", "e.contact_uuid", "ct.id")
      .leftJoin("Companies as co", "ct.company_uuid", "co.id")
      .select([
        "e.id as id",
        "e.event_name as event_name",
        "e.event_start as event_start",
        "e.event_end as event_end",
        "e.event_status as event_status",
        "e.contract_revenue_cents as contract_revenue_cents",
        "e.created_at as created_at",
        "e.booked_at as booked_at",
        "e.created_by_user_uuid as created_by_user_uuid",
        "u.first_name as account_manager_first_name",
        "u.last_name as account_manager_last_name",
        "u.email as account_manager_email",
        "a.street as address_street",
        "a.city as address_city",
        "a.state_province as address_state",
        "ct.first_name as contact_first_name",
        "ct.last_name as contact_last_name",
        "ct.email as contact_email",
        "co.company_name as company_name",
      ])
      .where("e.deleted", "=", 0)
      .orderBy("e.created_at", "desc")
      .compile();
  }, []);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<QuotesBookingsEvent>());

  const filtered = useMemo(() => {
    if (!data) return data;
    return filterQuotesBookingsEvents(data, filters, timezone);
  }, [data, filters, timezone]);

  return { data: filtered, isLoading, error };
}
