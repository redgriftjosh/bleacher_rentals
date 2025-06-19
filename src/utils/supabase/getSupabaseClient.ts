"use client";
import { type GetToken } from "@clerk/types";
import { supabaseClient } from "./supabaseClient";
import { SupabaseClient } from "@supabase/supabase-js";

export const getSupabaseClient = async (getToken: GetToken): Promise<SupabaseClient> => {
  const isDev = process.env.NODE_ENV === "development";
  const token = isDev
    ? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    : await getToken({ template: "supabase" });
  if (!token) throw new Error("Failed to get Supabase token");

  const supabase = await supabaseClient(token);
  if (!supabase) throw new Error("Failed to create Supabase client");

  return supabase;
};
