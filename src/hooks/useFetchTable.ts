"use client";

import { useEffect } from "react";
import { fetchTableSetStoreAndCache } from "@/lib/fetchSetStoreAndCache";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

type UseFetchTableOptions<T> = {
  tableName: string;
  setStore: (data: T[]) => void;
  stale: boolean;
  setStale: (stale: boolean) => void;
};

export function useFetchTable<T>({
  tableName,
  setStore,
  stale,
  setStale,
}: UseFetchTableOptions<T>) {
  const supabaseClient = useClerkSupabaseClient();
  useEffect(() => {
    if (!stale) return;

    const run = async () => {
      const ok = await fetchTableSetStoreAndCache(tableName, setStore, supabaseClient);
      // Only mark fresh if the fetch succeeded.
      // If it failed (often due to auth/session not ready), keep `stale=true`
      // so the effect can retry when the client/session changes.
      if (ok) setStale(false);
    };

    run();

    return () => {};
  }, [setStale, setStore, stale, supabaseClient, tableName]);
}
