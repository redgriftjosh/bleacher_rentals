"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { checkQuoteFreshness } from "./quoteVersion";

export type QuoteFreshness = { isStale: boolean; refresh: () => void };

/** Poll cadence while the tab is active. */
export const POLL_INTERVAL_MS = 10_000;
/** Up to this much random jitter is added per tick to avoid synchronized bursts. */
export const POLL_JITTER_MS = 1_500;

/**
 * Dev-only test hook: `?pollMs=` shortens the poll interval so e2e can exercise real timers
 * quickly. No-op in production builds. See docs/specs/quote-staleness-detection.md §14.
 */
export function pollIntervalMs(): number {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return POLL_INTERVAL_MS;
  }
  const raw = new URLSearchParams(window.location.search).get("pollMs");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : POLL_INTERVAL_MS;
}

/**
 * Polls `/api/quotes/[eventId]/version` every ~10 s **only while the tab is visible AND
 * focused**, pausing on hide/blur and resuming with an immediate check on show/focus.
 * Flips `isStale` only on a confirmed content-hash change. Suppressed for a signed-in
 * manager previewing (D1). See docs/specs/quote-staleness-detection.md §7.
 *
 * Focus is tracked via window blur/focus events (defaulting to focused) rather than
 * document.hasFocus(), which is unreliable in headless browsers.
 */
export function useQuoteFreshness(eventId: string, initialContentHash: string): QuoteFreshness {
  const { userId, isLoaded } = useAuth();
  const [isStale, setIsStale] = useState(false);

  const isStaleRef = useRef(false);
  isStaleRef.current = isStale;

  useEffect(() => {
    if (!isLoaded || userId || !initialContentHash) return;

    let cancelled = false;
    let focused = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const isActive = () => document.visibilityState === "visible" && focused;

    async function runCheck() {
      if (cancelled || isStaleRef.current || !isActive()) return;
      controller?.abort();
      controller = new AbortController();
      const result = await checkQuoteFreshness(
        eventId,
        initialContentHash,
        fetch,
        controller.signal,
      );
      if (!cancelled && !("error" in result) && result.stale) {
        setIsStale(true);
      }
    }

    const baseInterval = pollIntervalMs();
    function scheduleNext() {
      if (cancelled || isStaleRef.current) return;
      const delay = baseInterval + Math.floor(Math.random() * POLL_JITTER_MS);
      timer = setTimeout(async () => {
        await runCheck();
        scheduleNext();
      }, delay);
    }

    function onResume() {
      if (isActive()) void runCheck();
    }
    function onFocus() {
      focused = true;
      onResume();
    }
    function onBlur() {
      focused = false;
    }

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    scheduleNext();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [eventId, initialContentHash, userId, isLoaded]);

  return { isStale, refresh: () => window.location.reload() };
}
