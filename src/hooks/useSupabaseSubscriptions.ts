"use client";

import { useEffect } from "react";
import { type GetToken } from "@clerk/types";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useUsersStore } from "@/state/userStore";

export default function useSupabaseSubscriptions() {
  const { getToken } = useAuth();

  const setBleachers = useBleachersStore((s) => s.setBleachers);
  const setBleachersLoading = useBleachersStore((s) => s.setLoading);
  useTableSubscription(
    "Bleachers",
    "bleachers-subscription",
    setBleachers,
    setBleachersLoading,
    getToken
  );

  const setHomeBases = useHomeBasesStore((s) => s.setHomeBases);
  const setHomeBasesLoading = useHomeBasesStore((s) => s.setLoading);
  useTableSubscription(
    "HomeBases",
    "homebases-subscription",
    setHomeBases,
    setHomeBasesLoading,
    getToken
  );

  const setUsers = useUsersStore((s) => s.setUsers);
  const setUsersLoading = useUsersStore((s) => s.setLoading);
  useTableSubscription("Users", "homebases-subscription", setUsers, setUsersLoading, getToken);
}

function useTableSubscription<T>(
  tableName: string,
  channelName: string,
  setStore: (data: T[]) => void,
  setLoading: (setLoaded: boolean) => void,
  getToken: GetToken
) {
  useEffect(() => {
    let supabase: ReturnType<typeof import("@/utils/supabase/client").createClient>;

    const setup = async () => {
      const STORAGE_KEY = `cached-${tableName}`;
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          setStore(JSON.parse(cached));
          setLoading(false); // show something while fetching fresh
        } catch (err) {
          console.error("Failed to parse cache for", tableName);
        }
      }

      const token = await getToken({ template: "supabase" });
      if (!token) {
        console.warn(`No token found for ${tableName}`);
        return;
      }

      supabase = createClient(token);

      const fetchData = async () => {
        const { data } = await supabase.from(tableName).select("*");
        if (data) setStore(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setLoading(false);
      };

      await fetchData();

      console.log(`Subscribing to ${tableName} Table...`);
      const channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table: tableName }, (payload) => {
          console.log(`Change received on ${tableName}:`, payload);
          toast(`${tableName} ${payload.eventType}`, {
            description: JSON.stringify(payload.new, null, 2),
          });
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setup();
  }, [tableName, channelName, setStore, setLoading, getToken]);
}
