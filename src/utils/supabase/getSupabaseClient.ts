// "use client";
// import { supabaseClient } from "./supabaseClient";
// import { SupabaseClient } from "@supabase/supabase-js";

// export const getSupabaseClient = async (supabaseToken: string): Promise<SupabaseClient> => {
//   // const isDev = process.env.NODE_ENV === "development";
//   // const token = isDev ? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY : supabaseToken;
//   const token = supabaseToken;
//   if (!token) throw new Error("Failed to get Supabase token");

//   const supabase = await supabaseClient(token);
//   if (!supabase) throw new Error("Failed to create Supabase client");

//   return supabase;
// };
