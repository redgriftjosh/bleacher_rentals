"use client";

import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
// lib/fetchTableAndSetStore.ts
import { supabaseClient } from "@/utils/supabase/supabaseClient";
import { type GetToken } from "@clerk/types";
// import { createClient } from "@supabase/supabase-js";

/**
 * Fetches data from any Supabase table updates a Zustand store and caches it.
 *
 * @param getToken - Clerk getToken function
 * @param tableName - Supabase table to query
 * @param setStore - Zustand store setter for the table's data
 */

export const fetchTableSetStoreAndCache = async <T>(
  getToken: GetToken,
  tableName: string,
  setStore: (data: T[]) => void
) => {
  const STORAGE_KEY = `cached-${tableName}`;
  // const isDev = process.env.NODE_ENV === "development";
  // const token = isDev
  //   ? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  //   : await getToken({ template: "supabase" });
  // if (!token) return;

  const supabase = await getSupabaseClient(getToken);
  // supabase.realtime.setAuth(token);

  const { data, error } = await supabase.from(tableName).select("*");
  console.log(`Fetched ${tableName}:`, data);

  if (error) {
    console.error(`Failed to fetch ${tableName}:`, error);
    return;
  }

  if (data) {
    setStore(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};
