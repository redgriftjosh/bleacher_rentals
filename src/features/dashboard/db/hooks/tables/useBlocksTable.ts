"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type BlockRow = {
  block_uuid: string;
  bleacher_uuid: string | null;
  text: string | null;
  date: string | null;
};

const compiled = db
  .selectFrom("Blocks as bl")
  .select([
    "bl.id as block_uuid",
    "bl.bleacher_uuid",
    "bl.text",
    "bl.date",
  ])
  .compile();

export function useBlocksTable() {
  return useTypedQuery(compiled, expect<BlockRow>());
}
