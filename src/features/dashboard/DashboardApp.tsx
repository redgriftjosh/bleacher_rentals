"use client";

import { Application, Assets, Graphics, Sprite, Texture } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { main } from "./main";
import { filterEvents, filterSortPixiBleachers } from "../dashboardOptions/util";
import bunny from "./GSLogo.png";
import { Bleacher, DashboardEvent } from "./types";
import { useFilterDashboardStore } from "../dashboardOptions/useFilterDashboardStore";
import { useCurrentEventStore } from "../eventConfiguration/state/useCurrentEventStore";

type DashboardAppV3Props = {
  bleachers: Bleacher[];
  events: DashboardEvent[];
  summerAssignedBleacherIds?: number[];
  winterAssignedBleacherIds?: number[];
  // When this token changes, force the dashboard to refresh its committed data
  refreshToken?: number;
  onWorkTrackerSelect?: (workTracker: {
    work_tracker_id: number;
    bleacher_id: number;
    date: string;
  }) => void;
};

export default function DashboardAppV3({
  bleachers,
  events,
  summerAssignedBleacherIds = [],
  winterAssignedBleacherIds = [],
  refreshToken = 0,
  onWorkTrackerSelect,
}: DashboardAppV3Props) {
  // Filtering state from existing dashboard stores
  const homeBaseIds = useFilterDashboardStore((s) => s.homeBaseIds);
  const winterHomeBaseIds = useFilterDashboardStore((s) => s.winterHomeBaseIds);
  const rows = useFilterDashboardStore((s) => s.rows);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const isFormMinimized = useCurrentEventStore((s) => s.isFormMinimized);
  const selectedBleacherIds = useCurrentEventStore((s) => s.bleacherIds);
  const yAxis = useFilterDashboardStore((s) => s.yAxis);
  const optimizationMode = useFilterDashboardStore((s) => s.optimizationMode);
  const season = useFilterDashboardStore((s) => s.season);
  const stateProvinces = useFilterDashboardStore((s) => s.stateProvinces);

  const filteredBleachers = filterSortPixiBleachers(
    homeBaseIds,
    winterHomeBaseIds,
    rows,
    bleachers,
    selectedBleacherIds,
    isFormExpanded,
    optimizationMode,
    season,
    summerAssignedBleacherIds,
    winterAssignedBleacherIds
  );

  const sameByIds = (a: Bleacher[], b: Bleacher[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i].bleacherId !== b[i].bleacherId) return false;
    return true;
  };
  // Filter events by selected states/provinces when yAxis is Events
  const filteredEvents = useMemo(() => {
    if (yAxis !== "Events") return events;
    // If no regions selected, intentionally show nothing (parity with legacy behavior)
    if (!stateProvinces || stateProvinces.length === 0) return [];
    return filterEvents(events, stateProvinces);
  }, [events, stateProvinces, yAxis]);
  // Debounced version used to actually drive Pixi re-instantiation
  const [committedBleachers, setCommittedBleachers] = useState(filteredBleachers);
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const dashboardRef = useRef<any>(null); // Store dashboard instance for cleanup
  const initedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  const lastContentXRef = useRef<number | null>(null);
  const lastContentYRef = useRef<number | null>(null);
  // Persist scroll across rebuilds/filters
  const savedScrollXRef = useRef<number | null>(null);
  const savedScrollYRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resizeTrigger, setResizeTrigger] = useState(false);
  // Debounce timer for committing bleachers
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce filtered bleachers to avoid immediate rebuild on every transient change (e.g., isFormExpanded)
  useEffect(() => {
    // On first run (when committed === filtered) skip delay
    // if (committedBleachers === filteredBleachers) return;
    if (sameByIds(filteredBleachers, committedBleachers)) return;
    // If optimizationMode is ON and only selection changed, avoid rebuild entirely.
    // The memo above already removed selection from deps when optimizationMode is true,
    // so we arrive here only when filters/homebase/rows/bleachers actually changed.
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setCommittedBleachers(filteredBleachers);
      debounceTimerRef.current = null;
    }, 1000);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [filteredBleachers, committedBleachers]);

  // If external data changed (e.g., WorkTrackers saved) but bleacher IDs are the same,
  // force-commit the latest filteredBleachers immediately when refreshToken changes.
  useEffect(() => {
    setCommittedBleachers(filteredBleachers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const handleResize = useCallback(() => {
    // Cancel any pending flip
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    // Schedule a new flip exactly 1000ms after the *last* call
    resizeTimeoutRef.current = setTimeout(() => {
      // functional update avoids stale closure on `resizeTrigger`
      setResizeTrigger((v) => !v);
      resizeTimeoutRef.current = null;
    }, 1000);
  }, []);

  // When the form is minimized or restored, the vertical layout changes.
  // Reuse the same 1000ms debounced resize path used for window resizes.
  useEffect(() => {
    handleResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormMinimized, isFormExpanded]);

  useEffect(() => {
    const app = new Application();
    appRef.current = app;

    let destroyed = false;

    (async () => {
      const host = hostRef.current!;
      await app.init({
        resizeTo: host,
        background: "#ffffff",
        // resolution: Math.min(2, window.devicePixelRatio || 1),
        resolution: window.devicePixelRatio,
        autoDensity: true,
        antialias: false,
        powerPreference: "high-performance",
        roundPixels: false,
      });

      if (destroyed || appRef.current !== app) return;

      host.appendChild(app.canvas);

      // Clear the stage properly before adding new content (only on subsequent renders)
      if (!isFirstRenderRef.current) {
        try {
          // Stop the ticker temporarily to prevent rendering during cleanup
          app.ticker.stop();

          // Clean up previous dashboard instance
          if (dashboardRef.current) {
            try {
              if (typeof dashboardRef.current.getScrollPositions === "function") {
                const { x, y } = dashboardRef.current.getScrollPositions();
                savedScrollXRef.current = x;
                savedScrollYRef.current = y;
              }
            } catch {}
            try {
              if (typeof dashboardRef.current.destroy === "function") {
                dashboardRef.current.destroy();
              }
            } catch {}
            dashboardRef.current = null;
          }

          // 3. Recursively destroy all children and their textures
          const destroyChildrenRecursively = (container: any) => {
            while (container.children && container.children.length > 0) {
              const child = container.children[0];

              // If it has children, destroy them first
              if (child.children && child.children.length > 0) {
                destroyChildrenRecursively(child);
              }

              // Remove from parent first
              container.removeChild(child);

              // Then destroy with all options
              if (child && typeof child.destroy === "function") {
                child.destroy({
                  children: true,
                  texture: true,
                  textureSource: true,
                  context: true,
                });
              }
            }
          };

          destroyChildrenRecursively(app.stage);

          // 4. Clear any remaining stage references
          app.stage.removeChildren();

          // 5. Force garbage collection of textures
          if (app.renderer && (app.renderer as any).texture && (app.renderer as any).texture.gc) {
            (app.renderer as any).texture.gc();
          }

          // 6. Wait a frame before restarting
          await new Promise((resolve) => setTimeout(resolve, 16));

          // Restart the ticker
          app.ticker.start();
        } catch (error) {
          console.warn("Error clearing PIXI stage:", error);
          // Even if cleanup fails, restart the ticker
          try {
            app.ticker.start();
          } catch (tickerError) {
            console.warn("Error restarting ticker:", tickerError);
          }
        }
      }

      // Small delay to ensure cleanup is complete before recreating (only on subsequent renders)
      if (!isFirstRenderRef.current) {
        // Add a longer delay to ensure all cleanup is complete
        setTimeout(() => {
          if (!destroyed && appRef.current === app) {
            console.log("not first render, lastContentXRef.current:", lastContentXRef.current);
            try {
              const dashboard = main(app, committedBleachers, filteredEvents, yAxis, {
                onWorkTrackerSelect,
                initialScrollX: savedScrollXRef.current,
                initialScrollY: savedScrollYRef.current,
              });
              dashboardRef.current = dashboard;
              initedRef.current = true;
            } catch (error) {
              console.error("Error initializing PIXI main:", error);
            }
          }
        }, 50); // Increased delay
      } else {
        // First render - no delay needed
        console.log("First render lastContentXRef.current:", lastContentXRef.current);
        try {
          const dashboard = main(app, committedBleachers, filteredEvents, yAxis, {
            onWorkTrackerSelect,
            initialScrollX: savedScrollXRef.current,
            initialScrollY: savedScrollYRef.current,
          });
          dashboardRef.current = dashboard;
          initedRef.current = true;
        } catch (error) {
          console.error("Error initializing PIXI main on first render:", error);
        }
      }

      isFirstRenderRef.current = false;
    })();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      destroyed = true;

      // Clear pending debounce commit if unmounting
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Clean up dashboard first
      if (dashboardRef.current) {
        try {
          if (typeof dashboardRef.current.getScrollPositions === "function") {
            const { x, y } = dashboardRef.current.getScrollPositions();
            savedScrollXRef.current = x;
            savedScrollYRef.current = y;
          }
        } catch {}
        try {
          if (typeof dashboardRef.current.destroy === "function") {
            dashboardRef.current.destroy();
          }
        } catch {}
        dashboardRef.current = null;
      }

      const app = appRef.current;
      appRef.current = null;
      initedRef.current = false;

      if (app && (app as any).renderer) {
        try {
          // More thorough cleanup on unmount
          app.ticker.stop();
          if (app.renderer && (app.renderer as any).texture && (app.renderer as any).texture.gc) {
            (app.renderer as any).texture.gc();
          }

          // Destroy the application
          app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        } catch (error) {
          console.warn("Error during PIXI cleanup:", error);
          // Even if cleanup fails, try basic destroy
          try {
            app.destroy();
          } catch (destroyError) {
            console.warn("Error during basic PIXI destroy:", destroyError);
          }
        }
      }
    };
  }, [
    committedBleachers,
    resizeTrigger,
    handleResize,
    onWorkTrackerSelect,
    filteredEvents,
    yAxis,
    refreshToken,
  ]);
  return (
    <div className="w-full h-full pl-2 relative">
      <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />
    </div>
  );
}
