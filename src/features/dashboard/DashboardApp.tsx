"use client";

import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { main } from "./main";
import { Baker } from "./util/Baker";
import { useFilterDashboardStore } from "../dashboardOptions/useFilterDashboardStore";

type Props = {
  summerAssignedBleacherIds?: number[];
  winterAssignedBleacherIds?: number[];
};

export default function DashboardApp({
  summerAssignedBleacherIds = [],
  winterAssignedBleacherIds = [],
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const dashboardRef = useRef<any>(null);
  const hostResizeObserverRef = useRef<ResizeObserver | null>(null);
  // No callback plumbing; click handling writes to a zustand store from inside Pixi

  // Store assignment IDs into filter store for downstream filtering logic
  useEffect(() => {
    const state = useFilterDashboardStore.getState();
    state.setField("summerAssignedBleacherIds", summerAssignedBleacherIds);
    state.setField("winterAssignedBleacherIds", winterAssignedBleacherIds);
  }, [summerAssignedBleacherIds, winterAssignedBleacherIds]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    const scheduleInit = () => {
      rafId = requestAnimationFrame(async () => {
        if (cancelled) return;
        const host = hostRef.current;
        if (!host || !host.isConnected) {
          // If host isn't attached yet, try again next frame
          scheduleInit();
          return;
        }

        const app = new Application();
        appRef.current = app;

        try {
          await app.init({
            resizeTo: host,
            background: "#ffffff",
            resolution: window.devicePixelRatio,
            autoDensity: true,
            antialias: false,
            powerPreference: "high-performance",
            roundPixels: false,
          });

          if (cancelled || appRef.current !== app) {
            try {
              app.destroy();
            } catch {}
            return;
          }

          if (!host.contains(app.canvas)) host.appendChild(app.canvas);

          // Defer dashboard creation to the next frame after Pixi completes its internal resize
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (cancelled || appRef.current !== app) {
            try {
              app.destroy();
            } catch {}
            return;
          }

          const dashboard = main(app, {});
          dashboardRef.current = dashboard;

          // Observe host element size so CSS-driven changes (e.g., sliding panels)
          // cause a dashboard resize/rebuild on the next frame
          let roRaf = 0;
          const coalescedNotify = () => {
            if (roRaf) cancelAnimationFrame(roRaf);
            roRaf = requestAnimationFrame(() => {
              roRaf = 0;
              // Sync renderer resolution to current DPR before dashboard rebuild
              try {
                const dprNow = window.devicePixelRatio || 1;
                if ((app as any)?.renderer && (app as any).renderer.resolution !== dprNow) {
                  (app as any).renderer.resolution = dprNow;
                  app.resize();
                }
              } catch {}
              // Piggy-back on Dashboard's existing window resize handler
              try {
                window.dispatchEvent(new Event("resize"));
              } catch {}
            });
          };
          const ro = new ResizeObserver(() => {
            if (cancelled) return;
            coalescedNotify();
          });
          try {
            ro.observe(host);
            hostResizeObserverRef.current = ro;
          } catch {}
        } catch (error) {
          console.error("Error initializing PIXI main:", error);
        }
      });
    };

    scheduleInit();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (dashboardRef.current) {
        try {
          if (typeof dashboardRef.current.destroy === "function") {
            dashboardRef.current.destroy();
          }
        } catch {}
        dashboardRef.current = null;
      }
      try {
        hostResizeObserverRef.current?.disconnect();
        hostResizeObserverRef.current = null;
      } catch {}
      const app = appRef.current;
      appRef.current = null;
      if (app) {
        try {
          app.ticker.stop();
          if (app.renderer && (app.renderer as any).texture && (app.renderer as any).texture.gc) {
            (app.renderer as any).texture.gc();
          }
          app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        } catch (error) {
          console.warn("Error during PIXI cleanup:", error);
          try {
            app.destroy();
          } catch {}
        }
      }
    };
  }, []);

  return (
    <div className="w-full h-full pl-2 relative min-w-0 overflow-hidden">
      <div
        ref={hostRef}
        className="w-full h-full min-w-0 overflow-hidden border-l border-t border-gray-300"
      />
    </div>
  );
}
