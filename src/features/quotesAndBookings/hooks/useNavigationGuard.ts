"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Pending = { type: "push"; url: string } | { type: "back" } | null;

/**
 * Blocks in-app navigation away from the current page while `shouldBlock()`
 * returns true, surfacing a prompt instead. The Next.js App Router has no
 * built-in navigation guard, so we intercept two paths:
 *
 *   1. Clicks on internal `<a>`/`<Link>` elements (capture phase).
 *   2. The browser Back/Forward buttons (history `popstate`), using a seeded
 *      buffer entry so the first back press fires against us.
 *
 * Refresh / tab-close is handled separately by a `beforeunload` listener on the
 * page (the browser only allows its own native dialog there).
 *
 * Returns the prompt state plus `confirm` (proceed with the blocked navigation)
 * and `cancel` (stay on the page). `shouldBlock` is read through a ref so the
 * listeners stay stable and the history buffer is seeded exactly once.
 */
export function useNavigationGuard(shouldBlock: () => boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);

  const blockRef = useRef(shouldBlock);
  blockRef.current = shouldBlock;

  // When set, the next popstate is our own programmatic navigation — let it pass.
  const bypassPop = useRef(false);

  // 1. Intercept internal link clicks.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const dest = url.pathname + url.search;
      const here = window.location.pathname + window.location.search;
      if (dest === here) return;

      if (!blockRef.current()) return;

      e.preventDefault();
      e.stopPropagation();
      setPending({ type: "push", url: dest });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 2. Intercept browser back/forward. Seed a buffer entry once on mount.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      if (bypassPop.current) {
        bypassPop.current = false;
        return;
      }
      if (!blockRef.current()) return;
      // Re-trap: undo the back so we stay put, then prompt.
      window.history.pushState(null, "", window.location.href);
      setPending({ type: "back" });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const confirm = useCallback(() => {
    const p = pending;
    setPending(null);
    if (!p) return;
    if (p.type === "push") {
      router.push(p.url);
    } else {
      // Skip our seed + re-trap buffer entries to reach the real previous page.
      bypassPop.current = true;
      window.history.go(-2);
    }
  }, [pending, router]);

  const cancel = useCallback(() => setPending(null), []);

  return { isBlocking: pending !== null, confirm, cancel };
}
