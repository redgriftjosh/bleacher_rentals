"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function QuotesSentHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dataType", "quotes-sent");
    if (!params.get("timeRange")) params.set("timeRange", "weekly");
    if (!params.get("accountManager")) params.set("accountManager", "all");
    router.replace(`/scorecard?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}
