// "use client";

// import { useEffect } from "react";
// import { type GetToken } from "@clerk/types";
// import { createClient } from "@/utils/supabase/client";
// import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
// import { fetchTableSetStoreAndCache } from "@/lib/fetchSetStoreAndCache";
// import { supabaseClient } from "@/utils/supabase/supabaseClient";

// type UseSubscribeToTableOptions<T> = {
//   tableName: string;
//   channelName: string;
//   getToken: GetToken;
//   setStore: (data: T[]) => void;
//   subscriptionId: number;
// };

// export function useSubscribeToTable<T>({
//   tableName,
//   channelName,
//   getToken,
//   setStore,
//   subscriptionId,
// }: UseSubscribeToTableOptions<T>) {
//   useEffect(() => {
//     // console.log(`Subscribing to ${tableName} [${subscriptionId}]`);
//     let channel: RealtimeChannel | null = null;
//     let supabase: SupabaseClient | null = null;

//     const subscribe = async () => {
//       const token = await getToken({ template: "supabase" });
//       if (!token) return;

//       // supabase = createClient(token);
//       supabase = await supabaseClient(token);
//       supabase.realtime.setAuth(token);

//       channel = supabase
//         .channel(channelName)
//         .on("postgres_changes", { event: "*", schema: "public", table: tableName }, () => {
//           console.log(`Change detected on ${tableName}, fetching...`);
//           fetchTableSetStoreAndCache(getToken, tableName, setStore);
//         })
//         .subscribe((status, err) => {
//           if (err) {
//             console.error(`Subscription error on ${tableName}`, status, err);
//           }
//         });
//     };

//     subscribe();

//     return () => {
//       if (channel && supabase) {
//         supabase.removeChannel(channel);
//         // console.log(`Cleaned up ${tableName} [${subscriptionId}]`);
//       }
//       channel = null;
//       supabase = null;
//     };
//   }, [subscriptionId]);
// }
