import { pusherClient } from "@/lib/pusher";
import { useEffect } from "react";

export default function useSubToDbChanges() {
  useEffect(() => {
    pusherClient.subscribe("db-changes-channel");

    pusherClient.bind("update-database", (data: { tables: string[] }) => {
      console.log("Pusher data:", data);
      //   data.tables.forEach((table) => {
      //     if (table in setStaleByTable) {
      //       setStaleByTable[table as keyof typeof setStaleByTable]();
      //     }
      //   });
    });

    return () => {
      pusherClient.unsubscribe("db-changes-channel");
      pusherClient.unbind_all();
      pusherClient.disconnect();
    };
  }, []);
}
