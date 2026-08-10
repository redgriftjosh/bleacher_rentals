"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_IDLE_MS = 15 * 60 * 1000; // 15 minutes
const FOREGROUND_TICK_MS = 30 * 1000;

/**
 * Dev-only test hook: `?idleMs=` shortens the idle threshold so e2e can exercise the real
 * timer quickly. No-op in production builds.
 */
function idleOverrideMs(): number | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("idleMs");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
const ACTIVITY_EVENTS = [
  "pointerdown",
  "mousemove",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
  "click",
] as const;

/** Pure idle decision — unit-tested without a DOM. */
export function computePresence(input: { lastActiveAt: number; now: number; idleMs: number }): {
  idle: boolean;
} {
  return { idle: input.now - input.lastActiveAt >= input.idleMs };
}

export type PresenceState = { promptPresence: boolean; confirmPresent: () => void };

/**
 * Shows an "Are you still here?" prompt after `idleMs` of absence. Absence counts both
 * no-interaction time on a visible tab AND time the tab/app was backgrounded — the latter
 * is evaluated on return (browsers throttle background timers). See
 * docs/specs/quote-staleness-detection.md §8.
 *
 * Suppressed for a signed-in manager previewing the page (D1).
 */
export function usePresenceCheck(opts?: { idleMs?: number }): PresenceState {
  const idleMs = opts?.idleMs ?? idleOverrideMs() ?? DEFAULT_IDLE_MS;
  // Evaluate often enough to catch the threshold, but never busier than needed.
  const tickMs = Math.max(250, Math.min(FOREGROUND_TICK_MS, Math.floor(idleMs / 3)));
  const { userId, isLoaded } = useAuth();
  const [promptPresence, setPromptPresence] = useState(false);

  const lastActiveAtRef = useRef(Date.now());
  const promptRef = useRef(false);
  promptRef.current = promptPresence;

  const confirmPresent = useCallback(() => {
    lastActiveAtRef.current = Date.now();
    setPromptPresence(false);
  }, []);

  useEffect(() => {
    if (!isLoaded || userId) return; // manager preview → no prompt

    lastActiveAtRef.current = Date.now();
    let cancelled = false;

    function markActive() {
      // Interaction only counts while the prompt is not up (clicking Yes handles that).
      if (!promptRef.current) lastActiveAtRef.current = Date.now();
    }

    function evaluate() {
      if (cancelled || promptRef.current) return;
      if (
        computePresence({ lastActiveAt: lastActiveAtRef.current, now: Date.now(), idleMs }).idle
      ) {
        setPromptPresence(true);
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        // Read elapsed BEFORE treating the return as activity, so background time counts.
        evaluate();
        if (!promptRef.current) lastActiveAtRef.current = Date.now();
      }
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, markActive, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") evaluate();
    }, tickMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, markActive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [idleMs, userId, isLoaded]);

  return { promptPresence, confirmPresent };
}
