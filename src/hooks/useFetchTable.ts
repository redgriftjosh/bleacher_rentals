"use client";

import { useEffect } from "react";
import { type GetToken } from "@clerk/types";
import { fetchTableSetStoreAndCache } from "@/lib/fetchSetStoreAndCache";

type UseFetchTableOptions<T> = {
  tableName: string;
  getToken: GetToken;
  setStore: (data: T[]) => void;
  stale: boolean;
  setStale: (stale: boolean) => void;
};

export function useFetchTable<T>({
  tableName,
  getToken,
  setStore,
  stale,
  setStale,
}: UseFetchTableOptions<T>) {
  useEffect(() => {
    if (!stale) return;
    const run = async () => {
      await fetchTableSetStoreAndCache(getToken, tableName, setStore);
      setStale(false);
    };

    run();

    return () => {};
  }, [stale]);
}

// "use client";

// import { useEffect } from "react";
// import { type GetToken } from "@clerk/types";
// import { fetchTableSetStoreAndCache } from "@/lib/fetchSetStoreAndCache";
// import { SupabaseClient } from "@supabase/supabase-js";
// import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

// type UseFetchTableOptions<T> = {
//   tableName: string;
//   getToken: GetToken;
//   setStore: (data: T[]) => void;
//   stale: boolean;
//   setStale: (stale: boolean) => void;
// };

// export function useFetchTable<T>({
//   tableName,
//   getToken,
//   setStore,
//   stale,
//   setStale,
// }: UseFetchTableOptions<T>) {
//   let supabase: SupabaseClient | null = null;

//   useEffect(() => {
//     // console.log(`stale: ${stale}`);
//     if (!stale) return;
//     const run = async () => {
//       const STORAGE_KEY = `cached-${tableName}`;
//       const token = await getToken({ template: "supabase" });
//       if (!token) return;

//       // console.log(`Token ${token}`);

//       // supabase = createClient(token);
//       // need to use this one. the client.ts one doesn't work and I wasted many hours discovering that.
//       supabase = await getSupabaseClient(token);
//       supabase.realtime.setAuth(token);

//       const { data, error } = await supabase.from(tableName).select("*");

//       if (error) {
//         console.error(`Failed to fetch ${tableName}:`, error);
//         return;
//       }

//       if (data) {
//         setStore(data);
//         localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
//       }
//       setStale(false);
//     };

//     run();

//     return () => {
//       supabase = null;
//     };
//   }, [stale]);
// }
