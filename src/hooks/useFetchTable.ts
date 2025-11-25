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
      await fetchTableSetStoreAndCache(tableName, setStore, supabaseClient);
      setStale(false);
    };

    run();

    return () => {};
  }, [stale]);
}
