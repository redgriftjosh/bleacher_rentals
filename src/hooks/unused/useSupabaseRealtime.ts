"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from "@/utils/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

export const useSupabaseWithRealtime = () => {
  const { getToken } = useAuth();
  const supabaseRef = useRef<SupabaseClient<any, "public", any>>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const setupSupabase = async () => {
      const token = await getToken({ template: "supabase", skipCache: true });
      if (!token) {
        console.warn("No token found");
        return;
      }

      const supabase = createClient(token);
      supabase.realtime.setAuth(token);
      supabaseRef.current = supabase;

      intervalRef.current = setInterval(async () => {
        const newToken = await getToken({ template: "supabase" });
        if (newToken && supabaseRef.current) {
          supabaseRef.current.realtime.setAuth(newToken);
        }
      }, 50_000);

      if (isMounted) setReady(true);
    };

    setupSupabase();

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabaseRef.current = null;
    };
  }, [getToken]);

  return { supabase: supabaseRef, ready };
};
