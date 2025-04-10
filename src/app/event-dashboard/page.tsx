"use client";
import { useSupabaseWithRealtime } from "@/hooks/unused/useSupabaseRealtime";
import { useEffect } from "react";

export default function EventDashboardPage() {
  // const { supabase, ready } = useSupabaseWithRealtime();

  // useEffect(() => {
  //   console.log("supabase", supabase);
  //   if (!ready || !supabase.current) return;

  //   const supabaseClient = supabase.current;

  //   const channel = supabaseClient
  //     .channel("my-channel")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "Bleachers" }, (payload) => {
  //       console.log("🔄 Change received:", payload);
  //     });

  //   channel.subscribe();

  //   return () => {
  //     channel.unsubscribe(); // more accurate than removeChannel
  //   };
  // }, [ready, supabase]);

  return <div>I'm not doing anything rn...</div>;
}
