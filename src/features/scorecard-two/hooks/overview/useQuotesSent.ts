"use client";

import { useQuotes } from "./useQuotes";

export function useQuotesSent(createdByUserUuid?: string) {
  return useQuotes(false, false, createdByUserUuid);
}
