"use client";

import { StatType, ScorecardData } from "./types";
import { useNumberOfQuotesSigned } from "./useNumberOfQuotesSigned";
import { useValueOfQuotesSigned } from "./useValueOfQuotesSigned";
import { useRevenue } from "./useRevenue";
import { useBleacherUtilization } from "./useBleacherUtilization";
import { useNumberOfQuotesSent } from "./useNumberOfQuotesSent";

interface UseDataOptions {
  statType: StatType;
  accountManagerUuid?: string;
}

export function useData({ statType, accountManagerUuid }: UseDataOptions): ScorecardData {
  const quotesSent = useNumberOfQuotesSent(accountManagerUuid);
  const quotesSigned = useNumberOfQuotesSigned(accountManagerUuid);
  const valueOfQuotesSigned = useValueOfQuotesSigned(accountManagerUuid);
  const revenue = useRevenue(accountManagerUuid);
  const bleacherUtilization = useBleacherUtilization(accountManagerUuid);

  switch (statType) {
    case "number-of-quotes-sent":
      return quotesSent;
    case "number-of-quotes-signed":
      return quotesSigned;
    case "value-of-quotes-signed":
      return valueOfQuotesSigned;
    case "revenue":
      return revenue;
    case "bleacher-utilization":
      return bleacherUtilization;
  }
}
