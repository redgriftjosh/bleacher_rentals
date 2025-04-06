"use client";

import { useEffect } from "react";
import { type GetToken } from "@clerk/types";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@clerk/nextjs";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { toast } from "sonner";

export default function useSupabaseSubscriptions() {
  const { getToken } = useAuth();

  const setBleachers = useBleachersStore((s) => s.setBleachers);
  const setBleachersLoading = useBleachersStore((s) => s.setLoading);

  const setHomeBases = useHomeBasesStore((s) => s.setHomeBases);
  const setHomeBasesLoading = useHomeBasesStore((s) => s.setLoading);

  useTableSubscription(
    "Bleachers",
    "bleachers-subscription",
    setBleachers,
    setBleachersLoading,
    getToken
  );
  useTableSubscription(
    "HomeBases",
    "homebases-subscription",
    setHomeBases,
    setHomeBasesLoading,
    getToken
  );
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
      const token = await getToken({ template: "supabase" });
      if (!token) {
        console.warn(`No token found for ${tableName}`);
        return;
      }

      supabase = createClient(token);

      const fetchData = async () => {
        const { data } = await supabase.from(tableName).select("*");
        if (data) setStore(data);
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
