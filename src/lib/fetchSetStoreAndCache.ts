"use client";

/**
 * Fetches data from any Supabase table updates a Zustand store and caches it.
 *
 * @param tableName - Supabase table to query
 * @param setStore - Zustand store setter for the table's data
 * @param supabaseClient - Supabase client instance
 */

export const fetchTableSetStoreAndCache = async <T>(
  tableName: string,
  setStore: (data: T[]) => void,
  supabaseClient: any
) => {
  const STORAGE_KEY = `cached-${tableName}`;
  // console.log(`Token ${token}`);
  // if (!token) return;

  // const supabase = await getSupabaseClient(token);
  // const supabase = supabaseClient || (await getSupabaseClient(token));
  // if (supabaseClient) console.log("Using passed supabase client: ", tableName);
  // supabase.realtime.setAuth(token);

  const { data, error } = await supabaseClient.from(tableName).select("*");
  console.log(`Fetched ${tableName}:`, data);
  if (tableName === "Blocks") {
    // console.log("Blocks data:", data);
  }

  if (error) {
    console.error(`Failed to fetch ${tableName}:`, error);
    return;
  }

  if (data) {
    setStore(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};
