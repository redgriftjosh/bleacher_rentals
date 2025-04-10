"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { type GetToken } from "@clerk/types";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useUsersStore } from "@/state/userStore";
import { useInvitedUsersStore } from "@/state/invitedUserStore";
import { REALTIME_SUBSCRIBE_STATES, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { usePersistentSubscription } from "./unused/usePersistentSubscription";
import { useVisibilityChangeRefresh } from "./useVisibilityChangeRefresh";
import { useSetupTable } from "./useSetupTable";

// I made a video explaining this code
// https://www.loom.com/share/50e15eaa6e0e4f8e9e063ab896ecd8a1?sid=41289fe0-9b87-4026-a6a4-8ef9bd14f331
export default function useSupabaseSubscriptions() {
  const { getToken } = useAuth();
  const [subscriptionId, setSubscriptionId] = useState(0); // increments ever 30 seconds to re-trigger subscription hooks

  useEffect(() => {
    const interval = setInterval(() => {
      setSubscriptionId((id) => id + 1); // triggers unmount/remount of the hook
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const bleacherStore = useBleachersStore();
  useSetupTable({
    tableName: "Bleachers",
    channelName: "temp-bleachers-sub",
    getToken,
    setStore: bleacherStore.setBleachers,
    stale: bleacherStore.stale,
    setStale: bleacherStore.setStale,
    subscriptionId,
  });

  // const setHomeBases = useHomeBasesStore((s) => s.setHomeBases);
  // const setHomeBasesLoading = useHomeBasesStore((s) => s.setLoading);
  // useTableSubscription(
  //   "HomeBases",
  //   "homebases-subscription",
  //   setHomeBases,
  //   setHomeBasesLoading,
  //   getToken
  // );

  // const setUsers = useUsersStore((s) => s.setUsers);
  // const setUsersLoading = useUsersStore((s) => s.setLoading);
  // useTableSubscription("Users", "users-subscription", setUsers, setUsersLoading, getToken);

  // const setInvitedUsers = useInvitedUsersStore((s) => s.setInvitedUsers);
  // const setInvitedUsersLoading = useInvitedUsersStore((s) => s.setLoading);
  // useTableSubscription(
  //   "InvitedUsers",
  //   "invitedusers-subscription",
  //   setInvitedUsers,
  //   setInvitedUsersLoading,
  //   getToken
  // );
}

function useTableSubscription<T>(
  tableName: string,
  channelName: string,
  setStore: (data: T[]) => void,
  setLoading: (setLoaded: boolean) => void,
  getToken: GetToken
) {
  const supabaseRef = useRef<SupabaseClient<any, "public", any> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchData = useCallback(async () => {
    const STORAGE_KEY = `cached-${tableName}`;

    const token = await getToken({ template: "supabase" });
    if (!token) return;

    const supabase = createClient(token);
    supabase.realtime.setAuth(token);

    const { data, error } = await supabase.from(tableName).select("*");
    if (error) {
      console.error(`Failed to fetch ${tableName}:`, error);
      return;
    }

    if (data) {
      setStore(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLoading(false);
    }
  }, [tableName, setStore, setLoading]);

  useEffect(() => {
    const STORAGE_KEY = `cached-${tableName}`;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setStore(JSON.parse(cached));
        setLoading(false);
      } catch (err) {
        console.error("Failed to parse cache for", tableName);
      }
    }

    const setup = async () => {
      const token = await getToken({ template: "supabase" });
      if (!token) {
        console.warn(`No token found for ${tableName}`);
        return;
      }

      const supabase = createClient(token);
      supabase.realtime.setAuth(token);
      supabaseRef.current = supabase;

      const subscribeToChanges = () => {
        const channel = supabase
          .channel(channelName, { config: { private: false } })
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: tableName },
            async (payload) => {
              console.log(`Change received on ${tableName}:`, payload);
              toast(`${tableName} ${payload.eventType}`, {
                description: JSON.stringify(payload.new, null, 2),
              });
              await fetchData();
            }
          )
          .subscribe((status, err) => {
            if (err) {
              // console.log(`Connected to ${tableName} Table!`);
              console.error(`Subscription error for ${tableName}:`, status, err);
            } else {
              // console.error(`Subscription error for ${tableName}:`, status, err);
            }
          });

        channelRef.current = channel;
      };

      subscribeToChanges();
      await fetchData();

      intervalRef.current = setInterval(async () => {
        const newToken = await getToken({ template: "supabase" });
        if (!newToken) return;

        const newClient = createClient(newToken);
        newClient.realtime.setAuth(newToken);

        if (channelRef.current && supabaseRef.current) {
          await supabaseRef.current.removeChannel(channelRef.current);
        }

        supabaseRef.current = newClient;
        subscribeToChanges();

        console.log(`Refreshed auth token and resubscribed to ${tableName}`);
      }, 30000);
    };

    setup();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
      supabaseRef.current = null;
      channelRef.current = null;
    };
  }, [tableName, channelName, getToken, fetchData, setStore, setLoading]);
}
