"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function AccountManagerDetailPage() {
  const router = useRouter();
  const params = useParams<{ userUuid: string }>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.set("accountManager", params.userUuid);
    if (!urlParams.get("dataType")) urlParams.set("dataType", "all");
    if (!urlParams.get("timeRange")) urlParams.set("timeRange", "weekly");
    router.replace(`/scorecard?${urlParams.toString()}`);
  }, [params.userUuid, router, searchParams]);

  return null;
}
