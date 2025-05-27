"use client";

import { type GetToken } from "@clerk/types";
import { useVisibilityChangeRefresh } from "./useVisibilityChangeRefresh";
import { useFetchTable } from "./useFetchTable";
import { useCachedTable } from "./useCachedTable";

type UseSetupTableOptions<T> = {
  tableName: string;
  // channelName: string;
  getToken: GetToken;
  setStore: (data: T[]) => void;
  stale: boolean;
  setStale: (stale: boolean) => void;
  // subscriptionId: number;
};
// dont forget about cahing
export function useSetupTable<T>({
  tableName,
  // channelName,
  getToken,
  setStore,
  stale,
  setStale,
}: // subscriptionId,
UseSetupTableOptions<T>) {
  // Subscribe to the specified table. This will run every 30 seconds so the jwt token never expires.
  // useSubscribeToTable({
  //   tableName: tableName,
  //   channelName: channelName,
  //   getToken,
  //   setStore: setStore,
  //   subscriptionId,
  // });

  // If the user leaves the window for 30 seconds, we'll mark the data as stale which should trigger a refetch.
  useVisibilityChangeRefresh(() => setStale(true), 30000);

  // If the data is stale, we'll fetch it.
  // The data should be stale as soon as the user loads the app.
  useFetchTable({
    tableName: tableName,
    getToken,
    setStore: setStore,
    stale: stale,
    setStale: setStale,
  });

  useCachedTable({ tableName, setStore });
}
