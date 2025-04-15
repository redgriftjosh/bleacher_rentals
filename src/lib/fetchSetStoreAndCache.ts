"use client";

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
  const token = await getToken({ template: "supabase" });
  if (!token) return;

  const supabase = await supabaseClient(token);
  supabase.realtime.setAuth(token);

  const { data, error } = await supabase.from(tableName).select("*");

  if (error) {
    console.error(`Failed to fetch ${tableName}:`, error);
    return;
  }

  if (data) {
    setStore(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};
