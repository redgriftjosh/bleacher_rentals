import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function useSupabaseSubscriptionsV2() {
  const [token, setToken] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const supabaseRef = useRef<any>(null);

  const { getToken } = useAuth();

  // 🌱 Generate initial token
  useEffect(() => {
    const fetchToken = async () => {
      const t = await getToken({ template: "supabase" });
      if (t) setToken(t);
      else console.warn("No token found");
    };

    fetchToken();
  }, [getToken]);

  // 🔁 Refresh token every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      const newToken = await getToken({ template: "supabase" });
      if (newToken) setToken(newToken);
    }, 30000);

    return () => clearInterval(interval);
  }, [getToken]);

  // 📡 Subscribe to Supabase channel
  useEffect(() => {
    if (!token) return;

    const supabase = createClient(token);
    supabase.realtime.setAuth(token);
    supabaseRef.current = supabase;

    // Cleanup old channel
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("bleachers-subscription", {
        config: { private: false },
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "Bleachers" }, (payload) => {
        // console.log(`Change received on Bleachers:`, payload);
        toast(`Bleachers ${payload.eventType}`, {
          description: JSON.stringify(payload.new, null, 2),
        });
      })
      .subscribe((status, err) => {
        if (status === `SUBSCRIBED`) {
          // console.log(`Connected to Bleachers Table!`);
        } else {
          console.error(`Subscription error:`, err);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);
}
