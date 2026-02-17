"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function StatHistoryPage() {
  const router = useRouter();
  const params = useParams<{ stat: string }>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.set("dataType", params.stat);
    if (!urlParams.get("timeRange")) urlParams.set("timeRange", "weekly");
    if (!urlParams.get("accountManager")) urlParams.set("accountManager", "all");
    router.replace(`/scorecard?${urlParams.toString()}`);
  }, [params.stat, router, searchParams]);

  return null;
}
