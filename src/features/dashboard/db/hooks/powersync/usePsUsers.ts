"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsUserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  clerk_user_id: string | null;
};

const compiled = db
  .selectFrom("Users as u")
  .select(["u.id", "u.first_name", "u.last_name", "u.clerk_user_id"])
  .compile();

export function usePsUsers() {
  const { data } = useTypedQuery(compiled, expect<PsUserRow>());
  return data ?? [];
}
