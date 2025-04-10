"use client";

import { useEffect } from "react";

type UseCachedTableOptions<T> = {
  tableName: string;
  setStore: (data: T[]) => void;
};

// used while the fetching data
// should only be run once when the app loads
export function useCachedTable<T>({ tableName, setStore }: UseCachedTableOptions<T>) {
  useEffect(() => {
    const STORAGE_KEY = `cached-${tableName}`;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setStore(JSON.parse(cached));
      } catch (err) {
        console.error("Failed to parse cache for", tableName);
      }
    }

    return () => {};
  }, []);
}
