import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

export type ScorecardTarget = {
  quotes_weekly: number | null;
  quotes_quarterly: number | null;
};

export function useTargets() {
  const targetsQuery = useMemo(() => {
    return db
      .selectFrom("ScorecardTargets as st")
      .innerJoin("AccountManagers as am", "am.id", "st.account_manager_uuid")
      .select(["st.quotes_weekly as quotes_weekly", "st.quotes_quarterly as quotes_quarterly"])
      .where("am.is_active", "=", 1)
      .compile();
  }, []);

  const { data: targets = [] } = useTypedQuery(targetsQuery, expect<ScorecardTarget>());
  return targets;
}
