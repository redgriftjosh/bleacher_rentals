import { pusherClient } from "@/lib/pusher";
import { setStaleByTable } from "@/lib/zustandRegistery";
import { useEffect } from "react";

export default function useSubToDbChanges() {
  useEffect(() => {
    pusherClient.subscribe("db-changes-channel");

    const handleDbUpdate = (data: { tables: string[] }) => {
      console.log("Pusher data:", data);
      data.tables.forEach((table) => {
        if (table in setStaleByTable) {
          setStaleByTable[table as keyof typeof setStaleByTable]();
        }
      });
    };

    const handleStateChange = ({ previous, current }: any) => {
      console.log(`🔌 Pusher connection changed from ${previous} to ${current}`);
      if (current === "disconnected" || current === "unavailable" || current === "connecting") {
        setTimeout(() => {
          if (
            pusherClient.connection.state === "disconnected" ||
            pusherClient.connection.state === "unavailable" ||
            current === "connecting"
          ) {
            window.location.reload();
          }
        }, 10000);
      } else if (current === "connected") {
        // Pusher seems to forget about the channel publications if this runs so we'll set each table to stale to refetch everything.
        Object.values(setStaleByTable).forEach((setStale) => setStale());
      }
    };

    const handleError = (err: any) => {
      console.error("❌ Pusher connection error:", err);
    };

    pusherClient.bind("update-database", handleDbUpdate);
    pusherClient.connection.bind("state_change", handleStateChange);
    pusherClient.connection.bind("error", handleError);

    return () => {
      pusherClient.unsubscribe("db-changes-channel");
      pusherClient.unbind_all();
      pusherClient.unbind("update-database", handleDbUpdate);
      pusherClient.connection.unbind("state_change", handleStateChange);
      pusherClient.connection.unbind("error", handleError);
      pusherClient.disconnect();
    };
  }, []);
}
