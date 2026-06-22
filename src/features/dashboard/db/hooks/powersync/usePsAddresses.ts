"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsAddressRow = {
  id: string;
  street: string | null;
  city: string | null;
  state_province: string | null;
  zip_postal: string | null;
};

const compiled = db
  .selectFrom("Addresses as a")
  .select(["a.id", "a.street", "a.city", "a.state_province", "a.zip_postal"])
  .compile();

export function usePsAddresses() {
  const { data } = useTypedQuery(compiled, expect<PsAddressRow>());
  return data ?? [];
}
