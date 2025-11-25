"use client";

import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useEffect } from "react";

/**
 * This is a test component to verify that the Supabase client is working correctly.
 * It should always be an empty array because RLS should not allow any access before user is signed in.
 */
export default function TestComponent() {
  const supabase = useClerkSupabaseClient();
  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase.from("Users").select("*");
      if (error) {
        console.error("Error loading users:", error);
        return;
      }
      console.log("Loading users:", data);

      // setLoading(true)
      // const { data, error } = await client.from('tasks').select()
      // if (!error) setTasks(data)
      // setLoading(false)
    }

    loadUsers();
  }, [supabase]);
  return <div>Test Component</div>;
}
