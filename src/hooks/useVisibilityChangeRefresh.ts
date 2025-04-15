// hooks/useVisibilityChangeRefresh.ts
import { useEffect, useRef } from "react";

/*
This hook is used to refresh data when the window is hidden for a certain amount of time.
This is useful for when the user is on a different tab or window and the data is stale.
*/

export function useVisibilityChangeRefresh(
  fetchFn: () => void | Promise<void>,
  delayMs: number = 30000
) {
  const lastHiddenTime = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenTime.current = Date.now();
      } else if (
        document.visibilityState === "visible" &&
        lastHiddenTime.current &&
        Date.now() - lastHiddenTime.current > delayMs
      ) {
        console.log(
          `⏳ Window was hidden for ${Date.now() - lastHiddenTime.current}ms, refetching...`
        );
        fetchFn();
        lastHiddenTime.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchFn, delayMs]);
}
