"use client";

import { Application } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { main } from "./main";
import { Baker } from "./util/Baker";
import { useDashboardFilterSettings } from "../dashboardOptions/useDashboardFilterSettings";

export default function DashboardApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const dashboardRef = useRef<any>(null);
  const hostResizeObserverRef = useRef<ResizeObserver | null>(null);
  const [gpuDisabled, setGpuDisabled] = useState(false);
  // No callback plumbing; click handling writes to a zustand store from inside Pixi

  const { state: dashboardFilters } = useDashboardFilterSettings();
  const dashboardFiltersRef = useRef(dashboardFilters);

  // Push filter changes into Pixi dashboard instance
  useEffect(() => {
    dashboardFiltersRef.current = dashboardFilters;

    if (!dashboardFilters) return;
    if (!dashboardRef.current) return;
    try {
      dashboardRef.current.setFilters(dashboardFilters);
    } catch {}
  }, [dashboardFilters]);

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

          // Check if WebGL is available (GPU acceleration enabled)
          const rendererType = (app.renderer as any)?.type;
          if (rendererType !== "webgl" && rendererType !== 1) {
            // PixiJS fell back to canvas or failed to initialize WebGL
            setGpuDisabled(true);
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

          const dashboard = main(app, { filters: dashboardFiltersRef.current ?? undefined });
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
          // Initialization failure often indicates GPU/WebGL issues
          setGpuDisabled(true);
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
      {gpuDisabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="max-w-md p-6 border border-yellow-400 bg-yellow-50 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">GPU Acceleration Required</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  The dashboard requires GPU acceleration to display properly. Please enable
                  hardware acceleration in your browser settings.
                </p>
                <details className="text-xs text-yellow-700">
                  <summary className="cursor-pointer font-medium hover:text-yellow-900">
                    How to enable GPU acceleration
                  </summary>
                  <ul className="mt-2 space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Chrome/Edge:</strong> Settings → System → Enable "Use graphics
                      acceleration when available"
                    </li>
                    <li>
                      <strong>Firefox:</strong> Settings → General → Performance → Uncheck "Use
                      recommended performance settings" → Enable "Use hardware acceleration when
                      available"
                    </li>
                    <li>
                      <strong>Safari:</strong> Preferences → Advanced → Check "Show Develop menu" →
                      Develop → Experimental Features → Enable WebGL
                    </li>
                  </ul>
                  <p className="mt-2 text-yellow-600">
                    After enabling, please restart your browser.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        ref={hostRef}
        className="w-full h-full min-w-0 overflow-hidden border-l border-t border-gray-300"
      />
    </div>
  );
}
