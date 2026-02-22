"use client";

import { useQuotes } from "./useQuotes";

export function useValueOfQuotesSigned(createdByUserUuid?: string) {
  return useQuotes(true, true, createdByUserUuid);
}
