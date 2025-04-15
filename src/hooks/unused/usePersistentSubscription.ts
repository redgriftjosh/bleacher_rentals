"use client";

import { useEffect, useRef } from "react";
import { type GetToken } from "@clerk/types";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type UsePersistentSubscriptionOptions = {
  tableName: string;
  channelName: string;
  getToken: GetToken;
  onChange: (payload: any) => void;
  refreshIntervalMs?: number; // how often to refresh auth
};

/*
This doesn't seem to work for some reason. Not too sure why but the connection will still
just disconnect after the first jwt expires. It doesn't throw any errors or anything, but
we'll need to manually close and reopen the connection. I tried calling this hook twice
and it doesn't seem to log changes to the console twice so it should be okay if we have 
some overlap to ensure we don't miss any changes.
*/
export function usePersistentSubscription({
  tableName,
  channelName,
  getToken,
  onChange,
  refreshIntervalMs = 60000,
}: UsePersistentSubscriptionOptions) {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const token = await getToken({ template: "supabase" });
      if (!token) return;

      const supabase = createClient(token);
      supabase.realtime.setAuth(token);
      supabaseRef.current = supabase;

      const channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table: tableName }, onChange)
        .subscribe((status, err) => {
          if (err) {
            console.error(`Subscription error on ${tableName}`, status, err);
          }
        });

      channelRef.current = channel;

      // Refresh auth token periodically
      intervalRef.current = setInterval(async () => {
        const newToken = await getToken({ template: "supabase" });
        if (!newToken || !supabaseRef.current) return;
        supabaseRef.current.realtime.setAuth(newToken);
        console.log(
          `🔁 Refreshed auth token for ${tableName} @ ${new Date().toLocaleTimeString()}`
        );
      }, refreshIntervalMs);
    };

    setup();

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
      supabaseRef.current = null;
      channelRef.current = null;
    };
  }, [tableName, channelName, getToken, onChange, refreshIntervalMs]);
}
