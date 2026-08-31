"use client";

import { useEffect, useState } from "react";
import { toIsoDate } from "../logic/driverDocuments";

/**
 * Today's local calendar day as `YYYY-MM-DD`, resolved after mount.
 *
 * Deliberately empty on the first render: the server and the browser can sit on
 * different sides of midnight, and computing the day during render would make
 * the SSR markup disagree with hydration. Consumers treat "" as "date unknown",
 * which reads as an un-graded document for one frame rather than a wrong one.
 */
export function useTodayIso(): string {
  const [todayIso, setTodayIso] = useState("");

  useEffect(() => {
    setTodayIso(toIsoDate(new Date()));
  }, []);

  return todayIso;
}
