"use client";

import { useQuotes } from "./useQuotes";

export function useQuotesSigned(createdByUserUuid?: string) {
  return useQuotes(true, false, createdByUserUuid);
}
